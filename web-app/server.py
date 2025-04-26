from flask import Flask, jsonify, render_template, send_file, request, redirect, url_for, session
import subprocess
import os
import secrets
from datetime import datetime
from functools import wraps

# ==============================================
# Configuración de Seguridad y Entorno
# ==============================================
app = Flask(__name__,
            static_folder='frontend/static', 
            template_folder='frontend/templates')


app.secret_key = secrets.token_hex(16)
app.config['SESSION_COOKIE_SECURE'] = True  
app.config['PERMANENT_SESSION_LIFETIME'] = 1800  

# Usuarios autorizados (en producción usar base de datos)
USERS = {
    "admin": {
        "password": "proyecto1",  # Cambiar en producción
        "role": "admin"
    }
}

# ==============================================
# Configuración del GPIO (Real/Simulado)
# ==============================================
class MockGPIO:
    """Simulador completo de GPIO para desarrollo"""
    BCM = "BCM"
    OUT = "OUT"
    IN = "IN"
    HIGH = 1
    LOW = 0
    _pins = {}
    
    def setmode(self, mode):
        print(f"[GPIO] Modo configurado: {mode}")
        
    def setup(self, pin, mode):
        self._pins[pin] = {'mode': mode, 'state': self.LOW}
        print(f"[GPIO] Pin {pin} configurado como {mode}")
        
    def output(self, pin, state):
        if pin in self._pins:
            self._pins[pin]['state'] = state
            print(f"[GPIO] Pin {pin} establecido a {'HIGH' if state else 'LOW'}")
    
    def input(self, pin):
        return self._pins.get(pin, {}).get('state', self.LOW)
    
    def cleanup(self):
        self._pins.clear()
        print("[GPIO] Limpieza realizada")

# Configuración automática del entorno
try:
    import RPi.GPIO as GPIO
    print("✅ GPIO real detectado (Raspberry Pi)")
except (ImportError, RuntimeError):
    print("⚠️ Usando GPIO simulado")
    GPIO = MockGPIO()

# ==============================================
# Controladores del Sistema
# ==============================================
class LightController:
    """Gestión centralizada de las luces"""
    
    LIGHT_PINS = {
        1: 17,   # Sala
        2: 27,   # Cocina
        3: 22,   # Dormitorio 1
        4: 23,   # Dormitorio 2
        5: 24    # Comedor
    }
    
    def __init__(self):
        self._init_gpio()
        
    def _init_gpio(self):
        """Inicialización segura de pines GPIO"""
        GPIO.setmode(GPIO.BCM)
        for pin in self.LIGHT_PINS.values():
            try:
                GPIO.setup(pin, GPIO.OUT)
                GPIO.output(pin, GPIO.LOW)
            except Exception as e:
                print(f"Error inicializando pin {pin}: {str(e)}")
                
    def set_light(self, light_id, state):
        """Cambia el estado de una luz con validación"""
        if light_id not in self.LIGHT_PINS:
            return {"success": False, "error": "Light not found"}
            
        pin = self.LIGHT_PINS[light_id]
        try:
            GPIO.output(pin, GPIO.HIGH if state else GPIO.LOW)
            return {
                "success": True,
                "state": "on" if state else "off",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

class DoorMonitor:
    """Monitorización de estado de puertas"""
    
    DOOR_PINS = {
        1: 5,   # Puerta principal
        2: 6,   # Puerta trasera
        3: 13,  # Dormitorio 1
        4: 19   # Dormitorio 2
    }
    
    def __init__(self):
        self._init_gpio()
        
    def _init_gpio(self):
        """Configuración de pines como entrada"""
        GPIO.setmode(GPIO.BCM)
        for pin in self.DOOR_PINS.values():
            try:
                GPIO.setup(pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)
            except Exception as e:
                print(f"Error inicializando pin {pin}: {str(e)}")
    
    def get_door_state(self, door_id):
        """Obtiene el estado actual de una puerta"""
        if door_id not in self.DOOR_PINS:
            return {"error": "Door not found"}
            
        pin = self.DOOR_PINS[door_id]
        try:
            state = GPIO.input(pin)
            return {
                "state": "open" if state == GPIO.LOW else "closed",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {"error": str(e)}

# Instancias globales
light_controller = LightController()
door_monitor = DoorMonitor()

# ==============================================
# Sistema de Autenticación
# ==============================================
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect(url_for('login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        next_url = request.args.get('next') or url_for('dashboard')
        
        user = USERS.get(username)
        if user and user['password'] == password:
            session.permanent = True
            session['logged_in'] = True
            session['username'] = username
            session['role'] = user['role']
            return redirect(next_url)
            
        return render_template('login.html', 
                             error="Credenciales inválidas",
                             next=next_url)
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    GPIO.cleanup()
    return redirect(url_for('login'))

# ==============================================
# Endpoints Principales
# ==============================================
@app.route('/')
@login_required
def dashboard():
    return render_template('index.html', 
                         username=session.get('username'),
                         role=session.get('role'))

@app.route('/api/lights', methods=['GET'])
@login_required
def get_lights():
    return jsonify({
        "lights": [
            {
                "id": lid,
                "pin": pin,
                "state": "on" if GPIO.input(pin) else "off"
            } for lid, pin in LightController.LIGHT_PINS.items()
        ]
    })

@app.route('/api/lights/<int:light_id>', methods=['POST'])
@login_required
def control_light(light_id):
    data = request.get_json()
    if not data or 'state' not in data:
        return jsonify({"error": "Estado no proporcionado"}), 400
        
    state = data['state'].lower()
    if state not in ['on', 'off']:
        return jsonify({"error": "Estado inválido"}), 400
        
    result = light_controller.set_light(light_id, state == 'on')
    if not result['success']:
        return jsonify({"error": result['error']}), 500
        
    return jsonify({
        "status": "success",
        "light_id": light_id,
        "state": state,
        "timestamp": result['timestamp']
    })

@app.route('/api/doors', methods=['GET'])
@login_required
def get_doors():
    doors = {}
    for door_id in DoorMonitor.DOOR_PINS:
        state = door_monitor.get_door_state(door_id)
        doors[door_id] = state
    return jsonify(doors)

@app.route('/api/camera')
@login_required
def capture_image():
    try:
        if os.environ.get('FLASK_ENV') == 'development':
            return send_file('frontend/static/images/sample.jpg', mimetype='image/jpeg')
            
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"snapshot_{timestamp}.jpg"
        image_path = os.path.join(app.static_folder, 'images', filename)
        
        subprocess.run([
            'fswebcam',
            '-r', '1280x720',
            '--no-banner',
            image_path
        ], check=True)
        
        return send_file(image_path, mimetype='image/jpeg')
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/lights/status')
@login_required
def get_all_lights_status():
    return jsonify({
        "lights": [
            {
                "id": lid,
                "state": "on" if GPIO.input(pin) else "off"
            } for lid, pin in LightController.LIGHT_PINS.items()
        ]
    })

# ==============================================
# Manejo de Errores
# ==============================================
@app.errorhandler(401)
def unauthorized(error):
    return redirect(url_for('login', next=request.url))

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Recurso no encontrado"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Error interno del servidor"}), 500

# ==============================================
# Inicialización del Sistema
# ==============================================
if __name__ == '__main__':
    # Configuración de directorios
    os.makedirs(os.path.join(app.static_folder, 'images'), exist_ok=True)
    
    # Configuración de entorno
    app.config['ENV'] = 'development'  
    app.run(host='0.0.0.0', 
           port=5000, 
           debug=(app.config['ENV'] == 'development'),
           use_reloader=False)