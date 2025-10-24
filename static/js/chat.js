let mensajesContainer = document.getElementById('mensajes');
let mensajeInput = document.getElementById('mensaje');
let usuarioInput = document.getElementById('usuario');

// Esta funcion trae todos los mensajes del servidor
function cargarMensajes() {
    fetch('/api/messages')
        .then(response => response.json())
        .then(data => {
            if (data.messages) {
                mostrarMensajes(data.messages);
            }
        })
        .catch(error => {});
}

function mostrarMensajes(mensajes) {
    mensajesContainer.innerHTML = '';
    mensajes.forEach(mensaje => {
        let div = document.createElement('div');
        div.className = 'mensaje';
        div.innerHTML = `
            <strong>${mensaje.usuario}</strong>
            <span>${mensaje.mensaje}</span>
            <small>${mensaje.timestamp}</small>
        `;
        mensajesContainer.appendChild(div);
    });
    mensajesContainer.scrollTop = mensajesContainer.scrollHeight;
}

// Aqui envio el mensaje al servidor cuando el usuario presiona enviar
function enviarMensaje() {
    let usuario = usuarioInput.value.trim();
    let mensaje = mensajeInput.value.trim();
    
    if (!usuario || !mensaje) return;
    
    let originalMessage = mensaje;
    mensajeInput.value = '';
    
    fetch('/api/send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            usuario: usuario,
            mensaje: mensaje
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            setTimeout(cargarMensajes, 500);
        } else {
            mensajeInput.value = originalMessage;
        }
    })
    .catch(error => {
        mensajeInput.value = originalMessage;
    });
}

// Cuando carga la pagina inicio el chat y actualizo cada segundo
document.addEventListener('DOMContentLoaded', function() {
    cargarMensajes();
    setInterval(cargarMensajes, 1000);
});

document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && e.target.id === 'mensaje') {
        enviarMensaje();
    }
});