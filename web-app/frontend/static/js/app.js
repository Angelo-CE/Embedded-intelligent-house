// app.js - Controlador principal de la interfaz (Versión Final Funcional)

// ==============================================
// Funcionalidad para Control de Luces
// ==============================================
async function toggleLight(lightId) {
    const button = document.getElementById(`light${lightId}`);
    const newState = button.getAttribute('data-state') === 'on' ? 'off' : 'on';

    try {
        const response = await fetch(`/api/lights/${lightId}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ state: newState })
        });
        
        if(response.ok) {
            updateLightElements(lightId, newState);
            button.classList.add('success-pulse');
            setTimeout(() => button.classList.remove('success-pulse'), 500);
        }
    } catch(error) {
        showNotification('Error al controlar la luz', 'error');
    }
}

function updateLightElements(lightId, state) {
    // Actualizar botón
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
    }
}

// ==============================================
// Funcionalidad para Control de Puertas (CORREGIDO)
// ==============================================
async function toggleDoor(doorId) {
    const doorElement = document.getElementById(`door${doorId}`);
    const currentState = doorElement.getAttribute('data-state');
    const newState = currentState === 'open' ? 'closed' : 'open';

    try {
        const response = await fetch(`/api/doors/${doorId}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ state: newState })
        });

        if(response.ok) {
            // Actualización inmediata
            doorElement.setAttribute('data-state', newState);
            const icon = doorElement.querySelector('i');
            const text = doorElement.querySelector('span');
            icon.className = newState === 'open' ? 'fas fa-door-open' : 'fas fa-door-closed';
            text.textContent = newState === 'open' ? 'Abierta' : 'Cerrada';
        }
    } catch(error) {
        showNotification('Error al cambiar estado de puerta', 'error');
    }
}

function updateDoors() {
    fetch('/api/doors')
        .then(response => response.json())
        .then(data => {
            Object.entries(data).forEach(([doorId, doorData]) => {
                const doorElement = document.getElementById(`door${doorId}`);
                if(doorElement && doorData.state) {
                    doorElement.setAttribute('data-state', doorData.state);
                    doorElement.querySelector('i').className = doorData.state === 'open' 
                        ? 'fas fa-door-open' 
                        : 'fas fa-door-closed';
                    doorElement.querySelector('span').textContent = doorData.state === 'open' 
                        ? 'Abierta' 
                        : 'Cerrada';
                }
            });
        });
}

// ==============================================
// Control de Todas las Luces (CORREGIDO)
// ==============================================
async function controlAllLights(action) {
    try {
        const response = await fetch('/api/lights/all', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ state: action })  // Parámetro corregido
        });
        
        if(response.ok) {
            // Actualizar todos los elementos
            document.querySelectorAll('.light-btn').forEach(button => {
                button.setAttribute('data-state', action);
                button.querySelector('.btn-text').textContent = 
                    `${button.parentElement.querySelector('h3').textContent}: ${action.toUpperCase()}`;
            });
            
            document.querySelectorAll('.light-point').forEach(point => {
                point.classList.toggle('active', action === 'on');
            });
        }
    } catch(error) {
        showNotification('Error al controlar las luces', 'error');
    }
}

// ==============================================
// Funcionalidad para la Cámara
// ==============================================
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

// ==============================================
// Sistema de Notificaciones
// ==============================================
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

// ==============================================
// Inicialización del Sistema (CORREGIDO)
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
    // Configurar puntos interactivos de luces
    document.querySelectorAll('.light-point').forEach(point => {
        point.addEventListener('click', () => toggleLight(point.dataset.lightId));
    });

    // Configurar clics en puertas
    document.querySelectorAll('.door-status').forEach(door => {
        door.closest('.door-card').addEventListener('click', () => {
            const doorId = door.id.replace('door', '');
            toggleDoor(doorId);
        });
    });

    // Cargar estado inicial de luces
    fetch('/api/lights')
        .then(response => response.json())
        .then(data => {
            data.lights.forEach(light => {
                updateLightElements(light.id, light.state);
            });
        });

    // Iniciar polling para puertas
    setInterval(updateDoors, 2000);
    updateDoors(); // Carga inicial
});

// ==============================================
// Cerrar Sesión
// ==============================================
function logout() {
    fetch('/logout')
        .then(() => window.location.href = '/login')
        .catch(error => showNotification('Error al cerrar sesión', 'error'));
}