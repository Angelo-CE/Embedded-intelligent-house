// app.js - Controlador principal de la interfaz

// Función principal para controlar luces
async function toggleLight(lightId) {
    const button = document.getElementById(`light${lightId}`);
    const point = document.querySelector(`[data-light-id="${lightId}"]`);
    const newState = button ? button.getAttribute('data-state') === 'on' ? 'off' : 'on' : 'off';

    try {
        const response = await fetch(`/api/lights/${lightId}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ state: newState })
        });
        
        const data = await response.json();
        
        if(data.status === 'success') {
            // Actualizar ambos elementos (botón y punto)
            updateLightElements(lightId, newState);
            
            // Animación de confirmación
            if(button) {
                button.classList.add('success-pulse');
                setTimeout(() => button.classList.remove('success-pulse'), 500);
            }
        }
    } catch(error) {
        console.error('Error:', error);
        showNotification('Error al controlar la luz', 'error');
    }
}

// Función para actualizar elementos de luz
function updateLightElements(lightId, state) {
    // Actualizar botón tradicional
    const button = document.getElementById(`light${lightId}`);
    if(button) {
        button.setAttribute('data-state', state);
        button.querySelector('.btn-text').textContent = 
            `${button.parentElement.querySelector('h3').textContent}: ${state.toUpperCase()}`;
    }

    // Actualizar punto interactivo
    const point = document.querySelector(`[data-light-id="${lightId}"]`);
    if(point) {
        point.classList.toggle('active', state === 'on');
        point.title = `Luz ${state === 'on' ? 'encendida' : 'apagada'}`;
    }
}

// Función para actualizar cámara
function refreshCamera() {
    const img = document.getElementById('cameraView');
    const timestampElement = document.getElementById('cameraTimestamp');
    
    img.classList.add('loading');
    timestampElement.textContent = 'Actualizando...';

    img.src = `/api/camera?t=${Date.now()}`;
    
    img.onload = () => {
        img.classList.remove('loading');
        timestampElement.textContent = new Date().toLocaleString();
    };
}

// Sistema de notificaciones
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

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    // Configurar tooltips y eventos para puntos interactivos
    document.querySelectorAll('.light-point').forEach(point => {
        point.addEventListener('click', () => toggleLight(point.dataset.lightId));
    });

    // Cargar estado inicial
    fetch('/api/lights')
        .then(response => response.json())
        .then(data => {
            data.lights.forEach(light => {
                updateLightElements(light.id, light.state);
            });
        });
});

// Control de todas las luces
async function controlAllLights(action) {
    try {
        const response = await fetch('/api/lights/all', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: action})
        });
        
        if(response.ok) {
            document.querySelectorAll('.light-btn, .light-point').forEach(element => {
                if(element.classList.contains('light-btn')) {
                    element.setAttribute('data-state', action);
                    element.querySelector('.btn-text').textContent = 
                        `${element.parentElement.querySelector('h3').textContent}: ${action.toUpperCase()}`;
                } else {
                    element.classList.toggle('active', action === 'on');
                }
            });
        }
    } catch(error) {
        showNotification('Error al controlar las luces', 'error');
    }
}

// Cerrar sesión
function logout() {
    fetch('/logout')
        .then(() => window.location.href = '/login')
        .catch(error => showNotification('Error al cerrar sesión', 'error'));
}