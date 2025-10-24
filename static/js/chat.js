// Configuración de la API - URL del backend en Render
const API_BASE_URL = 'https://chat-backend-python-sistemasic.onrender.com'; // URL de tu backend en Render

let usuariosColores = {};
let contadorUsuarios = 0;

// Variables de Pusher
let pusher = null;
let channel = null;
let pusherEnabled = false;

// Inicializar Pusher
async function initializePusher() {
    try {
        // Obtener configuración de Pusher del backend
        const response = await fetch(`${API_BASE_URL}/api/pusher/config`);
        const config = await response.json();
        
        if (config.enabled) {
            pusher = new Pusher(config.key, {
                cluster: config.cluster
            });

            channel = pusher.subscribe('chat');
            
            channel.bind('new-message', function(data) {
                agregarMensaje(data);
            });

            pusherEnabled = true;
            console.log('✅ Pusher conectado exitosamente');
        } else {
            console.log('⚠️ Pusher no está habilitado en el servidor');
            pusherEnabled = false;
        }
    } catch (error) {
        console.error('❌ Error al conectar con Pusher:', error);
        pusherEnabled = false;
    }
    
    // Si Pusher no está habilitado o falló, usar polling
    if (!pusherEnabled) {
        console.log('📡 Usando modo polling para actualizaciones');
        cargarMensajes();
        setInterval(cargarMensajes, 3000);
    } else {
        // Cargar mensajes iniciales
        cargarMensajes();
    }
}

function cargarMensajes() {
    fetch(`${API_BASE_URL}/api/messages`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Error:', data.error);
                return;
            }
            
            const container = document.getElementById('mensajes');
            if (!container) return;
            
            container.innerHTML = '';
            
            if (data.messages && data.messages.length > 0) {
                data.messages.forEach(msg => {
                    agregarMensaje(msg, false); // false = no hacer scroll automático
                });
                container.scrollTop = container.scrollHeight;
            } else {
                container.innerHTML = '<div class="sin-mensajes">No hay mensajes aún</div>';
            }
        })
        .catch(error => {
            console.error('Error de conexión:', error);
            // Mostrar mensaje de error en el chat
            const container = document.getElementById('mensajes');
            if (container) {
                container.innerHTML = '<div class="sin-mensajes">Error de conexión con el servidor</div>';
            }
        });
}

function agregarMensaje(msg, autoScroll = true) {
    const container = document.getElementById('mensajes');
    if (!container) return;

    // Remover mensaje de "sin mensajes" si existe
    const sinMensajes = container.querySelector('.sin-mensajes');
    if (sinMensajes) {
        sinMensajes.remove();
    }

    // Obtener el nombre del usuario actual
    const usuarioActual = document.getElementById('usuario').value.trim();
    
    const div = document.createElement('div');
    
    // Si es el usuario actual, va a la derecha (usuario-1)
    // Si es otro usuario, va a la izquierda (usuario-2)
    if (usuarioActual && msg.usuario === usuarioActual) {
        div.className = 'mensaje usuario-1'; // Derecha
    } else {
        div.className = 'mensaje usuario-2'; // Izquierda
    }
    
    // Formatear timestamp a hora 
    const fecha = new Date(msg.timestamp);
    const tiempo = fecha.toLocaleTimeString('es-PE', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
    
    div.innerHTML = `
        <div class="contenido-mensaje-wrapper">
            <div class="usuario">${msg.usuario}</div>
            <div class="contenido-mensaje">${msg.mensaje}</div>
            <div class="timestamp">${tiempo}</div>
        </div>
    `;
    
    container.appendChild(div);
    
    if (autoScroll) {
        container.scrollTop = container.scrollHeight;
    }
}

function enviarMensaje(event) {
    if (event) event.preventDefault();
    
    const usuario = document.getElementById('usuario').value.trim();
    const mensaje = document.getElementById('mensaje').value.trim();
    
    if (!usuario || !mensaje) {
        return false;
    }
    
    const data = {
        usuario: usuario,
        mensaje: mensaje
    };
    
    fetch(`${API_BASE_URL}/api/send`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error('Error:', data.error);
            alert('Error al enviar mensaje: ' + data.error);
            return;
        }
        
        document.getElementById('mensaje').value = '';
        // Si Pusher no está habilitado, recargar mensajes manualmente
        if (!pusherEnabled) {
            cargarMensajes();
        }
    })
    .catch(error => {
        console.error('Error de envío:', error);
        alert('Error de conexión al enviar mensaje');
    });
    
    return false;
}

document.addEventListener('DOMContentLoaded', function() {
    // Cargar mensajes iniciales
    cargarMensajes();
    
    // Inicializar Pusher para tiempo real
    initializePusher();
    
    // Manejar Enter en el campo de mensaje
    document.getElementById('mensaje').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            enviarMensaje();
        }
    });
});

// Limpiar conexión de Pusher al cerrar la página
window.addEventListener('beforeunload', function() {
    if (pusher) {
        pusher.disconnect();
    }
});