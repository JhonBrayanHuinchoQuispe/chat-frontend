const API_BASE_URL = 'https://chat-backend-6odp.onrender.com';

let usuariosColores = {};
let contadorUsuarios = 0;

let pusher = null;
let channel = null;
let pusherEnabled = false;

async function initializePusher() {
    try {
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
        } else {
            pusherEnabled = false;
        }
    } catch (error) {
        pusherEnabled = false;
    }
    
    // usar polling si pusher no funciona
    if (!pusherEnabled) {
        cargarMensajes();
        setInterval(cargarMensajes, 5000);
    } else {
        cargarMensajes();
    }
}

let ultimoMensajeCount = 0;

function cargarMensajes() {
    fetch(`${API_BASE_URL}/api/messages`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                return;
            }
            
            const container = document.getElementById('mensajes');
            if (!container) return;
            
            if (data.messages && data.messages.length !== ultimoMensajeCount) {
                container.innerHTML = '';
                ultimoMensajeCount = data.messages.length;
                
                if (data.messages.length > 0) {
                    data.messages.forEach(msg => {
                        agregarMensaje(msg, false);
                    });
                    container.scrollTop = container.scrollHeight;
                } else {
                    container.innerHTML = '<div class="sin-mensajes">No hay mensajes aún</div>';
                }
            }
        })
        .catch(error => {
            const container = document.getElementById('mensajes');
            if (container) {
                container.innerHTML = '<div class="sin-mensajes">Error de conexión</div>';
            }
        });
}

function agregarMensaje(msg, autoScroll = true) {
    const container = document.getElementById('mensajes');
    if (!container) return;

    const sinMensajes = container.querySelector('.sin-mensajes');
    if (sinMensajes) {
        sinMensajes.remove();
    }

    const usuarioActual = document.getElementById('usuario').value.trim();
    
    const div = document.createElement('div');
    
    // mensajes del usuario actual van a la derecha
    if (usuarioActual && msg.usuario === usuarioActual) {
        div.className = 'mensaje usuario-1';
    } else {
        div.className = 'mensaje usuario-2';
    }
    
    // Usar la hora local del navegador en lugar del timestamp del backend
    const ahora = new Date();
    const tiempo = ahora.toLocaleTimeString('es-PE', { 
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
    const mensajeInput = document.getElementById('mensaje');
    
    if (!usuario || !mensaje) {
        return false;
    }
    
    mensajeInput.value = '';
    mensajeInput.disabled = true;
    
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
        mensajeInput.disabled = false;
        
        if (data.error) {
            mensajeInput.value = mensaje;
            return;
        }
        
        if (!pusherEnabled) {
            setTimeout(cargarMensajes, 100);
        }
    })
    .catch(error => {
        mensajeInput.disabled = false;
        mensajeInput.value = mensaje;
    });
    
    return false;
}

document.addEventListener('DOMContentLoaded', function() {
    cargarMensajes();
    initializePusher();
    
    document.getElementById('mensaje').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            enviarMensaje();
        }
    });
});

window.addEventListener('beforeunload', function() {
    if (pusher) {
        pusher.disconnect();
    }
});