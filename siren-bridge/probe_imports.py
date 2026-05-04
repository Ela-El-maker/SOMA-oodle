
import sys
import os

BRIDGE_DIR = os.path.dirname(os.path.abspath(__file__))
ENGINE_DIR = os.path.join(BRIDGE_DIR, 'engine')

# Simulate the bridge environment
sys.path.insert(0, ENGINE_DIR)
os.environ['PYTHONPATH'] = ENGINE_DIR + os.pathsep + os.environ.get('PYTHONPATH', '')

print(f'--- PATH AUDIT ---')
print(f'BRIDGE_DIR: {BRIDGE_DIR}')
print(f'ENGINE_DIR: {ENGINE_DIR}')
print(f'SYS_PATH[0]: {sys.path[0]}')

print(f'\n--- IMPORT PROBE ---')
try:
    import fish_speech
    print(f'✅ fish_speech found at: {fish_speech.__file__}')
    
    from fish_speech.models.vqgan.modules.fsq import DownsampleFiniteScalarQuantize
    print(f'✅ DownsampleFiniteScalarQuantize successfully resolved.')
except Exception as e:
    print(f'❌ PROBE FAILED: {e}')
    
    # Check if the directory exists
    target_dir = os.path.join(ENGINE_DIR, 'fish_speech', 'models', 'vqgan', 'modules')
    print(f'Target Dir Exists: {os.path.exists(target_dir)}')
    if os.path.exists(target_dir):
        print(f'Target Dir Contents: {os.listdir(target_dir)}')
