let mensajesContainer = document.getElementById('mensajes');
let mensajeInput = document.getElementById('mensaje');
let usuarioInput = document.getElementById('usuario');

// URL del backend en Render
const API_BASE_URL = 'https://chat-backend-6odp.onrender.com';

// Debug: Verificar conexión al cargar la página
console.log('Intentando conectar con:', API_BASE_URL);

// Esta funcion trae todos los mensajes del servidor
function cargarMensajes() {
    console.log('Cargando mensajes desde:', `${API_BASE_URL}/api/messages`);
    
    // Agregar timeout para evitar errores de conexión
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout
    
    fetch(`${API_BASE_URL}/api/messages`, {
        signal: controller.signal,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
        .then(response => {
            clearTimeout(timeoutId);
            console.log('Respuesta recibida:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Datos recibidos:', data);
            if (data.messages) {
                mostrarMensajes(data.messages);
            }
        })
        .catch(error => {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                console.warn('Timeout al cargar mensajes - el servidor puede estar iniciando');
            } else {
                console.error('Error al cargar mensajes:', error);
            }
        });
}

function mostrarMensajes(mensajes) {
    mensajesContainer.innerHTML = '';
    mensajes.forEach(mensaje => {
        let div = document.createElement('div');
        div.className = 'mensaje';
        div.innerHTML = `
            <strong>${mensaje.usuario}:</strong> ${mensaje.mensaje}
            <span class="timestamp">${mensaje.timestamp}</span>
        `;
        mensajesContainer.appendChild(div);
    });
    mensajesContainer.scrollTop = mensajesContainer.scrollHeight;
}

// Aqui envio el mensaje al servidor cuando el usuario presiona enviar
function enviarMensaje() {
    let usuario = usuarioInput.value.trim();
    let mensaje = mensajeInput.value.trim();
    
    if (!usuario || !mensaje) {
        console.warn('Usuario o mensaje vacío');
        return;
    }
    
    let originalMessage = mensaje;
    mensajeInput.value = '';
    
    console.log('Enviando mensaje:', { usuario, mensaje: originalMessage });
    
    // Agregar timeout para evitar errores de POST
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout para POST
    
    fetch(`${API_BASE_URL}/api/send`, {
        signal: controller.signal,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            usuario: usuario,
            mensaje: originalMessage
        })
    })
    .then(response => {
        clearTimeout(timeoutId);
        console.log('Respuesta del envío:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Mensaje enviado exitosamente:', data);
        // Esperar un poco antes de recargar mensajes
        setTimeout(() => cargarMensajes(), 500);
    })
    .catch(error => {
        clearTimeout(timeoutId);
        console.error('Error al enviar mensaje:', error);
        
        // Restaurar el mensaje si hay error
        mensajeInput.value = originalMessage;
        
        if (error.name === 'AbortError') {
            alert('El servidor está tardando en responder. Intenta de nuevo en unos segundos.');
        } else {
            alert('Error al enviar mensaje. Verifica tu conexión.');
        }
    });
}

// Aqui inicializo el chat y actualizo los mensajes cada segundo
document.addEventListener('DOMContentLoaded', function() {
    console.log('Chat inicializado');
    
    // Cargar mensajes inicialmente
    cargarMensajes();
    
    // Actualizar mensajes cada 3 segundos (menos frecuente para evitar sobrecarga)
    setInterval(cargarMensajes, 3000);
    
    // Event listeners
    document.getElementById('enviar').addEventListener('click', enviarMensaje);
    
    mensajeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            enviarMensaje();
        }
    });
});