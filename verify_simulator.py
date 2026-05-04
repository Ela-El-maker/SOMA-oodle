#!/usr/bin/env python3
"""Quick verification that WorldSimulator works with SOMA."""

import sys
sys.path.insert(0, '.')

try:
    from world_model import KnowledgeGraph, SpatialMemory, TemporalMemory, WorldSimulator
    print("✅ World model modules import successfully")
    
    # Test basic simulator functionality
    simulator = WorldSimulator()
    
    # Add some initial state
    simulator.update_state({"robot_location": "kitchen", "door_state": "closed"})
    
    # Simulate an action
    action = {"type": "move", "target": "living_room", "confidence": 0.8}
    result = simulator.simulate(action, steps=1)
    
    print(f"✅ Simulator created and ran simulation: {result.get('success_probability', 0)}")
    
    # Test SOMA class import
    from soma import SOMA
    print("✅ SOMA class imports successfully")
    
    # Check if simulator is initialized
    soma_instance = SOMA()
    if hasattr(soma_instance, 'simulator'):
        print("✅ SOMA instance has simulator attribute")
    else:
        print("❌ SOMA instance missing simulator attribute")
        
except ImportError as e:
    print(f"❌ Import error: {e}")
except Exception as e:
    print(f"❌ Other error: {e}")
    import traceback
    traceback.print_exc()