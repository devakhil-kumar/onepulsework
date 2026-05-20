import client from './client';
import {API} from '@constants/apiRoutes';

export const authApi = {
  login: (email, password) =>
    client.post(API.AUTH.LOGIN, {email, password}).then(r => r.data.data),

  logout: () => client.post(API.AUTH.LOGOUT).then(r => r.data),

  me: () => client.get(API.AUTH.ME).then(r => r.data.data),

  changePassword: (currentPassword, newPassword) =>
    client
      .post(API.AUTH.CHANGE_PASSWORD, {currentPassword, newPassword})
      .then(r => r.data),

  updateMe: patch =>
    client.patch(API.AUTH.ME, patch).then(r => r.data.data),

  forgotPassword: email =>
    client.post(API.AUTH.FORGOT_PASSWORD, {email}).then(r => r.data),

  resetPassword: (email, otp, newPassword) =>
    client.post(API.AUTH.RESET_PASSWORD, {email, otp, newPassword}).then(r => r.data),
};
