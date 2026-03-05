// ==========================================
// ESTADO Y REFERENCIAS DEL DOM
// ==========================================
let isLoginMode = true; 
const API_URL = 'http://localhost:3000/api'; 

const authSection = document.getElementById('auth-section');
const wallSection = document.getElementById('wall-section');
const authForm = document.getElementById('auth-form');
const confirmPasswordInput = document.getElementById('confirm-password');
const authTitle = document.getElementById('auth-title');
const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
const btnSubmitAuth = document.getElementById('btn-submit-auth');
const btnShowLogin = document.getElementById('btn-show-login');
const btnLogout = document.getElementById('btn-logout');
const messagesContainer = document.getElementById('messages-container');
const publishForm = document.getElementById('publish-form');

// ==========================================
// LÓGICA DE INTERFAZ (UI)
// ==========================================

// Cambiar entre Login y Registro
toggleAuthModeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    
    if (isLoginMode) {
        authTitle.textContent = "Iniciar Sesión";
        btnSubmitAuth.textContent = "Entrar";
        toggleAuthModeBtn.textContent = "¿No tienes cuenta? Regístrate aquí";
        confirmPasswordInput.classList.add('hidden');
        confirmPasswordInput.removeAttribute('required');
    } else {
        authTitle.textContent = "Registrarse";
        btnSubmitAuth.textContent = "Crear cuenta";
        toggleAuthModeBtn.textContent = "¿Ya tienes cuenta? Inicia sesión";
        confirmPasswordInput.classList.remove('hidden');
        confirmPasswordInput.setAttribute('required', 'true');
    }
});

// Comprobar si hay sesión iniciada
function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        authSection.classList.add('hidden');
        btnShowLogin.classList.add('hidden');
        wallSection.classList.remove('hidden');
        btnLogout.classList.remove('hidden');
        loadMessages(); 
    } else {
        authSection.classList.remove('hidden');
        btnShowLogin.classList.remove('hidden');
        wallSection.classList.add('hidden');
        btnLogout.classList.add('hidden');
    }
}

// Cerrar sesión
btnLogout.addEventListener('click', () => {
    localStorage.removeItem('token'); 
    checkAuth(); 
});

// SEGURIDAD: Prevenir XSS inyectando como TextNode (textContent)
function renderMessages(mensajes) {
    messagesContainer.innerHTML = ''; 
    
    if (mensajes.length === 0) {
        messagesContainer.innerHTML = '<p>No hay mensajes aún. ¡Sé el primero!</p>';
        return;
    }

    mensajes.forEach(msg => {
        const div = document.createElement('div');
        div.className = 'mensaje';
        
        // ⚽ TRUCO HACKATHON: Extraer el "Username" cortando el email en la arroba '@'
        const username = msg.email ? msg.email.split('@')[0] : 'Jugador';
        
        // Creamos una cabecera para separar el nombre de la fecha
        const headerDiv = document.createElement('div');
        headerDiv.className = 'mensaje-header';
        
        const autor = document.createElement('strong');
        autor.textContent = username; // ¡Adiós al "dice:" y al @gmail.com!
        autor.style.textTransform = 'capitalize'; // Pone la primera letra en mayúscula
        
        const fecha = document.createElement('span');
        fecha.className = 'fecha';
        // Hacemos la fecha más corta (ej: 05/03/2026, 12:17)
        fecha.textContent = new Date(msg.created_at).toLocaleString([], {day:'2-digit', month:'2-digit', year:'numeric', hour: '2-digit', minute:'2-digit'});
        
        // Metemos nombre y fecha en la cabecera
        headerDiv.appendChild(autor);
        headerDiv.appendChild(fecha);
        
        const texto = document.createElement('p');
        texto.className = 'texto-mensaje';
        texto.textContent = msg.texto; 
        
        // Lo añadimos todo a la tarjeta del mensaje
        div.appendChild(headerDiv);
        div.appendChild(texto);
        
        messagesContainer.appendChild(div);
    });
}
// ==========================================
// PETICIONES A LA API (Fetch)
// ==========================================

// 1. Registro y Login
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('auth-error');
    
    errorDiv.classList.add('hidden');

    try {
        if (!isLoginMode) {
            // MODO REGISTRO
            const confirmPassword = confirmPasswordInput.value;
            if (password !== confirmPassword) throw new Error("Las contraseñas no coinciden.");

            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error en el registro');
            
            alert("¡Registro exitoso! Ahora inicia sesión.");
            toggleAuthModeBtn.click(); 

        } else {
            // MODO LOGIN
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Credenciales incorrectas');
            localStorage.setItem('email', email);
            localStorage.setItem('token', data.token);
            checkAuth(); 
        }
    } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.classList.remove('hidden');
    }
});

// 2. Cargar Muro
async function loadMessages() {
    try {
        const res = await fetch(`${API_URL}/mensajes`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Error al cargar el muro");
        renderMessages(data); 
    } catch (err) {
        messagesContainer.innerHTML = `<p style="color:red;">Error de conexión con el backend: ${err.message}</p>`;
    }
}

// 3. Publicar Mensaje
publishForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const texto = document.getElementById('new-message').value;
    const errorDiv = document.getElementById('publish-error');
    errorDiv.classList.add('hidden');
    const email = localStorage.getItem('email');

    const token = localStorage.getItem('token');
    if (!token) {
        alert("Debes iniciar sesión para publicar.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/mensajes`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 

            },

           body: JSON.stringify({ texto, email })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al publicar");

        document.getElementById('new-message').value = ''; 
        loadMessages(); 
    } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.classList.remove('hidden');
    }
});

// Arrancar la app verificando sesión
checkAuth();