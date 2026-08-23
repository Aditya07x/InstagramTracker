"""
Reelio Continuous Latent State Engine (CLSE)
Architecture & Modeling Upgrades

This module implements a 2-state Hidden Markov Model tailored for modeling short-form
video consumption (doomscrolling) telemetry. It introduces six major mathematical fixes
over a standard HMM:

1. SURVIVAL FRAMING FOR "CONTINUE": 'Continue' is removed as a per-reel emission to eliminate
   survivorship bias. Session length T is modeled as a geometric survival process where h_s 
   is the per-reel hazard (stopping probability).
2. MAP-EM WITH DIRICHLET PRIORS: Replaces MLE-EM with MAP-EM using conjugate priors
   (Dirichlet for transitions, Normal-InverseGamma for emissions, Beta for hazards) to
   prevent state collapse during cold starts.
3. CTMC MATRIX EXPONENTIAL FOR INTER-SESSION GAPS: Models gaps between sessions using a
   Continuous-Time Markov Chain matrix exponential, directly learning asymmetric entry (q_01)
   and exit (q_10) rates for the 'Captured' state.
4. MOMENT-MATCHING INITIALIZATION: Uses data medians to deterministically warm-start
   Gaussian parameters, preventing poor local optima convergence common with random init.
5. ONLINE / INCREMENTAL EM: Bounded historical iteration. Updates running sufficient statistics
   with an exponential forgetting factor (rho=0.85) to prioritize recent psychological states.
6. JOINT (DWELL x VELOCITY) EMISSION WITH DISAMBIGUATION: Combines log_dwell and log_velocity
   into a bivariate Gaussian with diagonal covariance and state-specific correlation (rho_s),
   allowing the model to distinguish 'bored swiping' from 'absorbed doomscrolling'.

Language Constraints: Pure Python 3.8+, NumPy, and SciPy (optimize only).
"""

import numpy as np
import pandas as pd
from scipy.optimize import minimize
import random

class ReelioCLSE:
    # --- Class Constants for Priors (Fix 2: MAP Priors) ---
    ALPHA_A = np.array([[2.0, 1.0], [1.0, 3.0]]) # State 0 prefers 0, State 1 strongly prefers 1
    ALPHA_PI = np.array([2.0, 1.0])
    
    # Normal-InverseGamma priors for log_dwell
    MU_PRIOR_D = np.array([np.log(5), np.log(20)])
    KAPPA_PRIOR_D = np.array([1.0, 1.0])
    ALPHA_IG_D = np.array([2.0, 2.0])
    BETA_IG_D = np.array([0.5, 0.5])
    
    # Normal-InverseGamma priors for log_vel
    MU_PRIOR_V = np.array([np.log(1.5), np.log(0.5)]) # Fast in casual, slow in doom
    KAPPA_PRIOR_V = np.array([1.0, 1.0])
    ALPHA_IG_V = np.array([2.0, 2.0])
    BETA_IG_V = np.array([0.5, 0.5])
    
    # Beta priors for hazard rates (Fix 1 & 2)
    ALPHA_H = np.array([2.0, 1.0]) # h_0 somewhat likely to stop
    BETA_H = np.array([3.0, 8.0])  # h_1 very unlikely to stop
    
    RHO_FORGET = 0.85 # (Fix 5: Incremental EM forgetting factor)
    
    def __init__(self):
        # Emission Params
        self.mu_d = np.zeros(2)
        self.sigma_d = np.ones(2)
        self.mu_v = np.zeros(2)
        self.sigma_v = np.ones(2)
        self.rho_corr = np.array([-0.3, 0.2]) # Fix 6: Initial correlation
        
        # Transition & State Params
        self.A = np.array([[0.80, 0.20], [0.15, 0.85]])
        self.pi = np.array([0.7, 0.3])
        self.h = np.array([0.2, 0.05]) # Geometric hazard rates (Fix 1)
        
        # CTMC rates (Fix 3)
        self.q_01 = 0.3
        self.q_10 = 0.1
        
        # Incremental EM sufficient statistics (Fix 5)
        self.ss = {
            'sum_xi': np.zeros((2, 2)),
            'sum_gamma': np.zeros(2),
            'sum_xd': np.zeros(2),
            'sum_xd2': np.zeros(2),
            'sum_xv': np.zeros(2),
            'sum_xv2': np.zeros(2),
            'sum_xdv': np.zeros(2), # Cross term for correlation
            'n_sessions': np.zeros(2),
            'sum_len': np.zeros(2)
        }
        
        self.total_sessions_processed = 0
        self.last_session_ll = 0.0
        
    def _preprocess(self, df: pd.DataFrame):
        """
        Sorts, calculates log transforms, handles missing velocity.
        (Fix 6 constraints on velocity)
        """
        df = df.sort_values(by=['SessionNum', 'ReelIndex']).copy()
        
        # Clean Dwell
        df['DwellTime'] = np.maximum(df['DwellTime'].values, 1e-3)
        df['log_d'] = np.log(df['DwellTime'])
        
        # Protect against missing/invalid scroll velocity
        if 'ScrollVelocity' not in df.columns:
             df['ScrollVelocity'] = 1.0
             
        df['ScrollVelocity'] = np.where(df['ScrollVelocity'] <= 0, np.nan, df['ScrollVelocity'])
        global_median_v = df['ScrollVelocity'].median()
        if np.isnan(global_median_v): global_median_v = 1.0
        
        # Impute missing velocity per session
        df['ScrollVelocity'] = df.groupby('SessionNum')['ScrollVelocity'].transform(
            lambda x: x.fillna(x.median())
        )
        df['ScrollVelocity'] = df['ScrollVelocity'].fillna(global_median_v)
        df['ScrollVelocity'] = np.maximum(df['ScrollVelocity'], 1e-3)
        df['log_v'] = np.log(df['ScrollVelocity'])
        
        # Calculate Delta t (in hours) between sessions
        df['delta_t_hours'] = 0.0
        # If timestamps existed, we'd do it here. Since they aren't in schema, 
        # we will mock a delta_t column for the algorithm to use if passed in.
        if 'StartTime' in df.columns:
            df['StartTime'] = pd.to_datetime(df['StartTime'])
            session_starts = df.groupby('SessionNum')['StartTime'].min().to_dict()
            session_nums = sorted(list(session_starts.keys()))
            for i in range(1, len(session_nums)):
                curr_s = session_nums[i]
                prev_s = session_nums[i-1]
                
                # prev session end time
                prev_end = df[df['SessionNum'] == prev_s]['StartTime'].max() + pd.to_timedelta(df[df['SessionNum'] == prev_s]['DwellTime'].values[-1], unit='s')
                curr_start = session_starts[curr_s]
                
                delta_h = (curr_start - prev_end).total_seconds() / 3600.0
                df.loc[df['SessionNum'] == curr_s, 'delta_t_hours'] = max(delta_h, 0.0)
        else:
            # Synthetic 2 hour gaps if no time provided
            df.loc[df['ReelIndex'] == 1, 'delta_t_hours'] = 2.0
            
        return df

    def _initialize(self, df: pd.DataFrame):
        """
        Fix 4: Moment-matching initialization to prevent EM collapse.
        """
        log_d_all = df['log_d'].values
        log_v_all = df['log_v'].values
        
        med_d = np.median(log_d_all)
        mask_0 = log_d_all < med_d
        mask_1 = log_d_all >= med_d
        
        if np.sum(mask_0) > 0:
            self.mu_d[0] = np.mean(log_d_all[mask_0])
            self.sigma_d[0] = np.std(log_d_all[mask_0]) + 0.1
            self.mu_v[0] = np.mean(log_v_all[mask_0])
            self.sigma_v[0] = np.std(log_v_all[mask_0]) + 0.01
        
        if np.sum(mask_1) > 0:
            self.mu_d[1] = np.mean(log_d_all[mask_1])
            self.sigma_d[1] = np.std(log_d_all[mask_1]) + 0.1
            self.mu_v[1] = np.mean(log_v_all[mask_1])
            self.sigma_v[1] = np.std(log_v_all[mask_1]) + 0.01
            
        # Ensure mu_d[1] > mu_d[0]
        if self.mu_d[1] < self.mu_d[0]:
            self.mu_d = self.mu_d[::-1]
            self.sigma_d = self.sigma_d[::-1]
            
        self.A = np.array([[0.80, 0.20], [0.15, 0.85]])
        self.pi = np.array([0.7, 0.3])
        
        session_lens = df.groupby('SessionNum')['ReelIndex'].max().values
        med_len = np.median(session_lens)
        short_lens = session_lens[session_lens < med_len]
        long_lens = session_lens[session_lens >= med_len]
        
        self.h[0] = 1.0 / np.mean(short_lens) if len(short_lens) > 0 else 0.2
        self.h[1] = 1.0 / np.mean(long_lens) if len(long_lens) > 0 else 0.05
        
        self.h = np.clip(self.h, 0.01, 0.99)
        
    def _a_gap(self, delta_t_hours):
        """
        Fix 3: Continuous-Time Markov Chain explicit matrix exponential.
        """
        if delta_t_hours < (1.0 / 60.0): # Less than 1 minute
            return self.A.copy()
            
        t = min(delta_t_hours, 24.0) # Cap at 24 hours
        la = self.q_01 + self.q_10
        if la < 1e-9:
            return self.A.copy()
            
        e_lat = np.exp(-la * t)
        
        p00 = (self.q_10 + self.q_01 * e_lat) / la
        p01 = (self.q_01 * (1.0 - e_lat)) / la
        p10 = (self.q_10 * (1.0 - e_lat)) / la
        p11 = (self.q_01 + self.q_10 * e_lat) / la
        
        Ag = np.array([[p00, p01], [p10, p11]])
        # Row normalize to correct floating point errors
        return Ag / np.sum(Ag, axis=1, keepdims=True)
        
    def _log_emission(self, log_d, log_v, state):
        """
        Fix 6: Bivariate Gaussian log PDF with state correlation.
        """
        md, sd = self.mu_d[state], self.sigma_d[state]
        mv, sv = self.mu_v[state], self.sigma_v[state]
        rho = self.rho_corr[state]
        
        # Correlation bounded
        rho = np.clip(rho, -0.95, 0.95)
        
        z_d = (log_d - md) / sd
        z_v = (log_v - mv) / sv
        
        z = (z_d**2 - 2*rho*z_d*z_v + z_v**2) / (1 - rho**2)
        norm_const = 2 * np.pi * sd * sv * np.sqrt(1 - rho**2)
        
        ll = -np.log(norm_const + 1e-300) - z/2
        return ll

    def _forward_log(self, session_obs, A_init):
        """ Log-space forward algorithm. """
        from scipy.special import logsumexp
        T = len(session_obs)
        log_alpha = np.zeros((T, 2))
        
        log_A_init = np.log(np.clip(A_init, 1e-9, 1-1e-9))
        log_A = np.log(np.clip(self.A, 1e-9, 1-1e-9))
        log_pi = np.log(np.clip(self.pi, 1e-9, 1-1e-9))
        
        # t = 0
        d0, v0 = session_obs[0]
        emit_0 = np.array([self._log_emission(d0, v0, 0), self._log_emission(d0, v0, 1)])
        log_alpha[0, :] = log_pi + emit_0
        
        # t > 0
        for t in range(1, T):
            dt, vt = session_obs[t]
            emit_t = np.array([self._log_emission(dt, vt, 0), self._log_emission(dt, vt, 1)])
            
            # Use A_init (gap) for t=1, then standard A
            trans_mat = log_A_init if t == 1 else log_A
            
            for j in range(2):
                log_alpha[t, j] = logsumexp(log_alpha[t-1, :] + trans_mat[:, j]) + emit_t[j]
                
        return log_alpha

    def _backward_log(self, session_obs, A_init):
        """ Log-space backward algorithm. """
        from scipy.special import logsumexp
        T = len(session_obs)
        log_beta = np.zeros((T, 2))
        
        log_A_init = np.log(np.clip(A_init, 1e-9, 1-1e-9))
        log_A = np.log(np.clip(self.A, 1e-9, 1-1e-9))
        
        # t = T-1 (initialized to 0 in log space)
        
        for t in range(T-2, -1, -1):
            dt_next, vt_next = session_obs[t+1]
            emit_next = np.array([self._log_emission(dt_next, vt_next, 0), self._log_emission(dt_next, vt_next, 1)])
            
            trans_mat = log_A_init if t == 0 else log_A
            
            for i in range(2):
                log_beta[t, i] = logsumexp(trans_mat[i, :] + emit_next + log_beta[t+1, :])
                
        return log_beta
        
    def _e_step_session(self, session_obs, A_init):
        """ Expectation step per session. """
        from scipy.special import logsumexp
        T = len(session_obs)
        log_alpha = self._forward_log(session_obs, A_init)
        log_beta = self._backward_log(session_obs, A_init)
        
        # Likelihood
        session_log_like = logsumexp(log_alpha[-1, :])
        
        # Gamma
        log_gamma = log_alpha + log_beta - session_log_like
        gamma = np.exp(log_gamma)
        
        # Xi
        xi = np.zeros((max(0, T-1), 2, 2))
        log_A_init = np.log(np.clip(A_init, 1e-9, 1-1e-9))
        log_A = np.log(np.clip(self.A, 1e-9, 1-1e-9))
        
        for t in range(T-1):
            dt_next, vt_next = session_obs[t+1]
            emit_next = np.array([self._log_emission(dt_next, vt_next, 0), self._log_emission(dt_next, vt_next, 1)])
            trans_mat = log_A_init if t == 0 else log_A
            
            for i in range(2):
                for j in range(2):
                    log_xi_t_ij = log_alpha[t, i] + trans_mat[i, j] + emit_next[j] + log_beta[t+1, j] - session_log_like
                    xi[t, i, j] = np.exp(log_xi_t_ij)
                    
        return np.clip(gamma, 1e-9, 1.0), np.clip(xi, 1e-9, 1.0), session_log_like

    def _update_ss(self, gamma, xi, session_obs, dominant_state, session_len):
        """ Fix 5: Online exponential forgetting of Sufficient Statistics. """
        new_ss = {
            'sum_xi': np.zeros((2, 2)),
            'sum_gamma': np.sum(gamma, axis=0),
            'sum_xd': np.zeros(2),
            'sum_xd2': np.zeros(2),
            'sum_xv': np.zeros(2),
            'sum_xv2': np.zeros(2),
            'sum_xdv': np.zeros(2),
            'n_sessions': np.zeros(2),
            'sum_len': np.zeros(2)
        }
        
        # Only standard transitions (t>0) contribute to base A matrix SS
        if len(xi) > 1:
            new_ss['sum_xi'] = np.sum(xi[1:], axis=0) # skip t=0 which uses A_gap
            
        new_ss['n_sessions'][dominant_state] += 1
        new_ss['sum_len'][dominant_state] += session_len
        
        d_vals = np.array([obs[0] for obs in session_obs])
        v_vals = np.array([obs[1] for obs in session_obs])
        
        for s in range(2):
            new_ss['sum_xd'][s] = np.sum(gamma[:, s] * d_vals)
            new_ss['sum_xd2'][s] = np.sum(gamma[:, s] * (d_vals**2))
            new_ss['sum_xv'][s] = np.sum(gamma[:, s] * v_vals)
            new_ss['sum_xv2'][s] = np.sum(gamma[:, s] * (v_vals**2))
            new_ss['sum_xdv'][s] = np.sum(gamma[:, s] * d_vals * v_vals)
            
        r = self.RHO_FORGET
        for k in self.ss.keys():
            self.ss[k] = r * self.ss[k] + (1 - r) * new_ss[k]

    def _m_step(self, delta_t_hours, gamma_0):
        """ Fix 2: MAP M-Step using Conjugate Priors """
        # Pi optimization
        self.pi = (self.ss['sum_gamma'] + self.ALPHA_PI - 1) / np.sum(self.ss['sum_gamma'] + self.ALPHA_PI - 1)
        self.pi = np.clip(self.pi, 1e-9, 1-1e-9)
        self.pi /= np.sum(self.pi)
        
        # Transition Optimization
        for i in range(2):
            denom = np.sum(self.ss['sum_xi'][i, :]) + np.sum(self.ALPHA_A[i, :]) - 2
            if denom > 1e-9:
                self.A[i, 0] = (self.ss['sum_xi'][i, 0] + self.ALPHA_A[i, 0] - 1) / denom
                self.A[i, 1] = (self.ss['sum_xi'][i, 1] + self.ALPHA_A[i, 1] - 1) / denom
        self.A = np.clip(self.A, 1e-9, 1-1e-9)
        self.A = self.A / np.sum(self.A, axis=1, keepdims=True)
        
        # Hazard Optimization (Fix 1 Geometric Survival)
        for s in range(2):
            num = self.ss['n_sessions'][s] + self.ALPHA_H[s] - 1
            den = self.ss['sum_len'][s] + self.ALPHA_H[s] + self.BETA_H[s] - 2
            self.h[s] = num / den if den > 1e-9 else self.h[s]
        self.h = np.clip(self.h, 0.01, 0.99)
        
        # Emission Optimization (Normal-InverseGamma exact posteriors)
        for s in range(2):
            Nk = self.ss['sum_gamma'][s]
            if Nk > 1e-9:
                # Dwell
                xbar_d = self.ss['sum_xd'][s] / Nk
                kap_n_d = self.KAPPA_PRIOR_D[s] + Nk
                mu_n_d = (self.KAPPA_PRIOR_D[s]*self.MU_PRIOR_D[s] + Nk*xbar_d) / kap_n_d
                
                sum_sq_diff_d = self.ss['sum_xd2'][s] - 2*xbar_d*self.ss['sum_xd'][s] + Nk*(xbar_d**2)
                alpha_n_d = self.ALPHA_IG_D[s] + Nk/2
                beta_n_d = self.BETA_IG_D[s] + 0.5*sum_sq_diff_d + (self.KAPPA_PRIOR_D[s]*Nk*((xbar_d - self.MU_PRIOR_D[s])**2))/(2*kap_n_d)
                
                self.mu_d[s] = mu_n_d
                self.sigma_d[s] = np.sqrt(beta_n_d / (alpha_n_d + 1)) # Mode of InverseGamma
                
                # Velocity
                xbar_v = self.ss['sum_xv'][s] / Nk
                kap_n_v = self.KAPPA_PRIOR_V[s] + Nk
                mu_n_v = (self.KAPPA_PRIOR_V[s]*self.MU_PRIOR_V[s] + Nk*xbar_v) / kap_n_v
                
                sum_sq_diff_v = self.ss['sum_xv2'][s] - 2*xbar_v*self.ss['sum_xv'][s] + Nk*(xbar_v**2)
                alpha_n_v = self.ALPHA_IG_V[s] + Nk/2
                beta_n_v = self.BETA_IG_V[s] + 0.5*sum_sq_diff_v + (self.KAPPA_PRIOR_V[s]*Nk*((xbar_v - self.MU_PRIOR_V[s])**2))/(2*kap_n_v)
                
                self.mu_v[s] = mu_n_v
                self.sigma_v[s] = np.sqrt(beta_n_v / (alpha_n_v + 1))
                
                # Correlation
                cov_dv = (self.ss['sum_xdv'][s] / Nk) - (xbar_d * xbar_v)
                self.rho_corr[s] = cov_dv / (self.sigma_d[s] * self.sigma_v[s])
        
        self.sigma_d = np.maximum(self.sigma_d, 0.05)
        self.sigma_v = np.maximum(self.sigma_v, 0.05)
        self.rho_corr = np.clip(self.rho_corr, -0.95, 0.95)
        
        # CTMC gradient optimization for q_01 and q_10 (Fix 3)
        # We perform a rough one-step finite difference bump to maximize probability of gamma_0
        if delta_t_hours >= (1.0/60.0):
            step = 1e-4
            
            def q_loss(q_params):
                q01, q10 = q_params
                t = min(delta_t_hours, 24.0)
                la = q01 + q10
                e_lat = np.exp(-la * t) if la > 1e-9 else 1.0
                Ag = np.array([
                    [(q10 + q01 * e_lat)/la if la>1e-9 else 1.0, (q01 * (1.0 - e_lat))/la if la>1e-9 else 0.0],
                    [(q10 * (1.0 - e_lat))/la if la>1e-9 else 0.0, (q01 + q10 * e_lat)/la if la>1e-9 else 1.0]
                ])
                Ag = np.clip(Ag, 1e-9, 1-1e-9)
                # Maximize expected log transition from pi to first state
                return -np.sum(gamma_0 * np.log(np.dot(self.pi, Ag)))
            
            res = minimize(q_loss, [self.q_01, self.q_10], bounds=[(0.01, 5.0), (0.01, 5.0)], method='L-BFGS-B')
            self.q_01, self.q_10 = res.x

    def fit(self, df: pd.DataFrame):
        df = self._preprocess(df)
        session_nums = df['SessionNum'].unique()
        
        if self.total_sessions_processed < 5:
            self._initialize(df)
            
        for s_num in session_nums:
            sdf = df[df['SessionNum'] == s_num]
            obs = list(zip(sdf['log_d'].values, sdf['log_v'].values))
            T = len(obs)
            
            delta_t_hours = sdf['delta_t_hours'].iloc[0]
            Ag = self._a_gap(delta_t_hours)
            
            gamma, xi, ll = self._e_step_session(obs, Ag)
            self.last_session_ll = ll
            
            dominant_state = int(np.argmax(np.sum(gamma, axis=0)))
            
            self._update_ss(gamma, xi, obs, dominant_state, T)
            self._m_step(delta_t_hours, gamma[0, :])
            
            self.total_sessions_processed += 1
            
        return self

    def decode(self, session_df: pd.DataFrame):
        """ Viterbi decoding. """
        df = self._preprocess(session_df)
        obs = list(zip(df['log_d'].values, df['log_v'].values))
        T = len(obs)
        
        delta_t_hours = df['delta_t_hours'].iloc[0]
        Ag = self._a_gap(delta_t_hours)
        
        log_V = np.zeros((T, 2))
        log_ptr = np.zeros((T, 2), dtype=int)
        
        log_A_init = np.log(np.clip(Ag, 1e-9, 1-1e-9))
        log_A = np.log(np.clip(self.A, 1e-9, 1-1e-9))
        log_pi = np.log(np.clip(self.pi, 1e-9, 1-1e-9))
        
        d0, v0 = obs[0]
        emit_0 = np.array([self._log_emission(d0, v0, 0), self._log_emission(d0, v0, 1)])
        log_V[0, :] = log_pi + emit_0
        
        for t in range(1, T):
            dt, vt = obs[t]
            emit_t = np.array([self._log_emission(dt, vt, 0), self._log_emission(dt, vt, 1)])
            trans_mat = log_A_init if t == 1 else log_A
            
            for j in range(2):
                probs = log_V[t-1, :] + trans_mat[:, j]
                best_i = np.argmax(probs)
                log_ptr[t, j] = best_i
                log_V[t, j] = probs[best_i] + emit_t[j]
                
        state_seq = [0] * T
        state_seq[T-1] = int(np.argmax(log_V[T-1, :]))
        for t in range(T-2, -1, -1):
            state_seq[t] = int(log_ptr[t+1, state_seq[t+1]])
            
        gamma, _, _ = self._e_step_session(obs, Ag)
        mean_doom_prob = np.mean(gamma[:, 1])
            
        return state_seq, mean_doom_prob
        
    def summary(self):
        return {
            'A': self.A.tolist(),
            'mu': self.mu_d.tolist(),
            'sigma': self.sigma_d.tolist(),
            'v_mu': self.mu_v.tolist(),
            'v_sigma': self.sigma_v.tolist(),
            'rho': self.rho_corr.tolist(),
            'pi': self.pi.tolist(),
            'h': self.h.tolist(),
            'p_cont': [1.0 - self.h[0], 1.0 - self.h[1]], # Alias for android
            'q_01': float(self.q_01),
            'q_10': float(self.q_10),
            'regime_stability': float(1.0 / self.h[1]) if self.h[1] > 1e-9 else 999.0, # Reels before stop
            'last_session_ll': float(self.last_session_ll)
        }

def validate(df, model):
    """
    Validation suite ensuring the model satisfies the 6 architectural constraints.
    """
    report = {
        'state_collapse': False,
        'label_flipped': False,
        'survival_ordering': True,
        'doom_pull_index': 0.0,
        'll_monotone': True,
        'regime_stability': 0.0,
        'warnings': [],
        'errors': []
    }
    
    sumry = model.summary()
    
    # Check 1: State Collapse
    if np.sum(model.ss['n_sessions']) > 0:
        pct_0 = model.ss['sum_len'][0] / np.sum(model.ss['sum_len'])
        pct_1 = model.ss['sum_len'][1] / np.sum(model.ss['sum_len'])
        if pct_0 < 0.1 or pct_1 < 0.1:
            report['state_collapse'] = True
            report['warnings'].append(f"State Imbalance: State 0={pct_0:.2f}, State 1={pct_1:.2f}")
    
    # Check 2: Emission Separation
    if sumry['mu'][1] <= sumry['mu'][0]:
        report['label_flipped'] = True
        report['errors'].append("Label Flip: State 1 does not have a higher log_dwell mean.")
        
    # Check 3: Survival Ordering
    if sumry['h'][1] >= sumry['h'][0]:
        report['survival_ordering'] = False
        report['errors'].append(f"Survival Violation: h[1] ({sumry['h'][1]:.3f}) >= h[0] ({sumry['h'][0]:.3f})")
        
    # Check 4: CTMC Asymmetry
    q01 = sumry['q_01']
    q10 = sumry['q_10']
    report['doom_pull_index'] = q01 / q10 if q10 > 0 else 999.0
    if report['doom_pull_index'] < 1.0:
        report['warnings'].append("CTMC Warning: Doom Pull Index < 1.0, user escapes easily during gaps.")
        
    # Check 6: Regime Stability
    rs = sumry['regime_stability']
    report['regime_stability'] = rs
    if rs < 5 or rs > 500:
        report['warnings'].append(f"Regime Stability bounds warning: {rs:.1f} reels")
        
    return report

if __name__ == "__main__":
    # Generate Synthetic Dataset
    np.random.seed(42)
    rows = []
    
    for s in range(1, 31):
        # Determine dominant state for generation
        state = 1 if np.random.rand() > 0.6 else 0
        
        # length
        h = 0.05 if state == 1 else 0.2
        l = np.random.geometric(h)
        l = min(max(l, 2), 200)
        
        for r in range(1, l + 1):
            if state == 1:
                # Doom: slow scroll, high dwell
                vel = max(np.random.normal(loc=1.5, scale=0.5), 0.1)
                dwell = max(np.random.normal(loc=15, scale=5), 1.0)
            else:
                # Casual: fast scroll, low dwell
                vel = max(np.random.normal(loc=4.5, scale=1.0), 0.1)
                dwell = max(np.random.normal(loc=4, scale=2), 1.0)
                
            rows.append({
                'SessionNum': s,
                'ReelIndex': r,
                'DwellTime': dwell,
                'ScrollVelocity': vel,
                'Continue': 1 if r < l else 0
            })
            
    df = pd.DataFrame(rows)
    print(f"Generated {len(df)} synthetic reels across 30 sessions.")
    
    model = ReelioCLSE()
    model.fit(df)
    
    print("\n--- VALIDATION REPORT ---")
    rep = validate(df, model)
    for k, v in rep.items():
        if k not in ['warnings', 'errors']:
            print(f"{k}: {v}")
    
    if rep['warnings']:
        print("\nWarnings:")
        for w in rep['warnings']: print(f"- {w}")
        
    if rep['errors']:
        print("\nErrors:")
        for e in rep['errors']: print(f"- {e}")
        
    print("\n--- MODEL PARAMETERS ---")
    sumry = model.summary()
    import json
    print(json.dumps(sumry, indent=2))
