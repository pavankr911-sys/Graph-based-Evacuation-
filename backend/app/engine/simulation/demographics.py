import random
from dataclasses import dataclass
from typing import Dict, Tuple

@dataclass
class DemographicProfile:
    name: str
    base_speed_mean: float  # meters per second
    base_speed_std: float
    radius: float           # meters
    color: str              # hex color for frontend visualization

# Standard demographic profiles based on literature
# Speed values in m/s
DEMOGRAPHIC_PROFILES: Dict[str, DemographicProfile] = {
    "ADULT": DemographicProfile(
        name="Adult",
        base_speed_mean=1.25,
        base_speed_std=0.1,
        radius=0.25,
        color="#3498db" # Blue
    ),
    "ELDERLY": DemographicProfile(
        name="Elderly",
        base_speed_mean=0.8,
        base_speed_std=0.15,
        radius=0.25,
        color="#9b59b6" # Purple
    ),
    "CHILD": DemographicProfile(
        name="Child",
        base_speed_mean=0.9,
        base_speed_std=0.2,
        radius=0.2,
        color="#f1c40f" # Yellow
    ),
    "DISABLED": DemographicProfile(
        name="Disabled (Wheelchair/Crutches)",
        base_speed_mean=0.6,
        base_speed_std=0.1,
        radius=0.4,
        color="#e74c3c" # Red
    )
}

# Default probability distribution
DEFAULT_DISTRIBUTION = {
    "ADULT": 0.70,
    "CHILD": 0.15,
    "ELDERLY": 0.10,
    "DISABLED": 0.05
}

def generate_agent_profile(distribution: Dict[str, float] = DEFAULT_DISTRIBUTION) -> Tuple[str, float]:
    """
    Randomly generates an agent profile based on the distribution.
    Returns a tuple of (profile_id, base_speed).
    """
    profiles = list(distribution.keys())
    weights = list(distribution.values())
    
    # Select demographic
    selected_id = random.choices(profiles, weights=weights, k=1)[0]
    profile = DEMOGRAPHIC_PROFILES[selected_id]
    
    # Calculate speed using normal distribution
    # Clamp speed to reasonable limits (min 0.2 m/s)
    speed = max(0.2, random.gauss(profile.base_speed_mean, profile.base_speed_std))
    
    return selected_id, speed

