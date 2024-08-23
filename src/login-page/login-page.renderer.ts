import { LoginEvents } from "../events/login.events"
;(function () {})()

document.addEventListener("DOMContentLoaded", () => {
  const link = window.envVars.AUTH_APP_URL + "recorder/auth"
  const loginLink = document.getElementById("login-link") as HTMLLinkElement
  loginLink.addEventListener("click", (event) => {
    event.preventDefault()
    window.electronAPI.openLinkInBrowser(link)
  })
  loginLink.href = link
})

// document.getElementById('loginForm').addEventListener('submit', (event) => {
//   event.preventDefault();
//
//   const username = document.getElementById('username').value;
//   const password = document.getElementById('password').value;
//   console.log(username)
//   // Отправляем данные логина на основной процесс
//   window.electronAPI.ipcRenderer.send('login-attempt', { username, password });
// });

window.electronAPI.ipcRenderer.on(LoginEvents.LOGIN_SUCCESS, () => {
  // alert('Login successful!');
  // Можно закрыть окно логина и открыть основное окно
})

window.electronAPI.ipcRenderer.on(LoginEvents.LOGIN_FAILED, () => {
  alert("Login failed. Try again.")
})

window.electronAPI.ipcRenderer.on(LoginEvents.TOKEN_CONFIRMED, (token) => {
  alert(token)
})
