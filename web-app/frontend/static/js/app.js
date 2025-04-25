// app.js - Controlador principal de la interfaz

async function toggleLight(lightId) {
    const button = document.getElementById(`light${lightId}`);
    const newState = button.getAttribute('data-state') === 'on' ? 'off' : 'on';

    try {
        const response = await fetch(`/api/lights/${lightId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ state: newState })
        });
        
        const data = await response.json();
        
        if(data.status === 'success') {
            // Actualizar interfaz
            button.setAttribute('data-state', newState);
            button.querySelector('.btn-text').textContent = `${button.parentElement.querySelector('h3').textContent}: ${newState.toUpperCase()}`;
            
            // Animación de confirmación
            button.classList.add('success-pulse');
            setTimeout(() => button.classList.remove('success-pulse'), 500);
        }
    } catch(error) {
        console.error('Error:', error);
        showNotification('Error al controlar la luz', 'error');
    }
}

function refreshCamera() {
    const img = document.getElementById('cameraView');
    const timestampElement = document.getElementById('cameraTimestamp');
    
    // Mostrar estado de carga
    img.classList.add('loading');
    timestampElement.textContent = 'Actualizando...';

    // Forzar recarga de imagen
    img.src = `/api/camera?t=${Date.now()}`;
    
    // Restaurar estado cuando carga la imagen
    img.onload = () => {
        img.classList.remove('loading');
        timestampElement.textContent = new Date().toLocaleString();
    };
}

// Función auxiliar para mostrar notificaciones
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Inicialización de estados al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    // Configurar tooltips
    document.querySelectorAll('.light-btn').forEach(button => {
        button.title = `Click para ${button.getAttribute('data-state') === 'on' ? 'apagar' : 'encender'}`;
    });
    
    // Cargar estado inicial de las luces
    fetch('/api/lights')
        .then(response => response.json())
        .then(data => {
            data.lights.forEach(light => {
                const button = document.getElementById(`light${light.id}`);
                if(button) {
                    const state = GPIO.input(light.pin) ? 'on' : 'off';
                    button.setAttribute('data-state', state);
                    button.querySelector('.btn-text').textContent = 
                        `${light.name}: ${state.toUpperCase()}`;
                }
            });
        });
});

function logout() {
    fetch('/logout')
        .then(() => window.location.href = '/login')
        .catch(error => showNotification('Error al cerrar sesión', 'error'));
}

async function controlAllLights(action) {
    try {
        const response = await fetch('/api/lights/all', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: action})
        });
        
        if(response.ok) {
            document.querySelectorAll('.light-btn').forEach(btn => {
                btn.setAttribute('data-state', action);
                btn.querySelector('.btn-text').textContent = 
                    `${btn.parentElement.querySelector('h3').textContent}: ${action.toUpperCase()}`;
            });
        }
    } catch(error) {
        showNotification('Error al controlar las luces', 'error');
    }
}