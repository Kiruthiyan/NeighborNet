"""
Seed data generation for NeighborNet Resilience demo.
Creates realistic data for a single city district.
"""

from datetime import datetime, timedelta, time
from typing import List, Dict, Any
from copy import deepcopy
import random

from ..models import (
    User, AccountType, UserCapabilities,
    Organization, OrganizationType, Location, OperatingHours,
    InventoryBatch, ResourceType, InventoryStatus, DietaryMetadata,
    Request, RequestStatus, UrgencyLevel, DeliveryWindow,
    Volunteer, VolunteerStatus, VolunteerAvailability, AvailabilitySlot,
    DisasterEvent, DisasterNeed, TaskPriority
)
from ..auth.security import hash_password

# Demo-only default password for every seeded account (documented in
# tasks.md). Real signups always set their own password via /api/auth/signup.
DEFAULT_DEMO_PASSWORD = "ChangeMe123!"


class SeedDataGenerator:
    """Generate realistic seed data for demo."""
    
    def __init__(self):
        self.users = []
        self.organizations = []
        self.inventory = []
        self.requests = []
        self.volunteers = []
        self.disasters = []
        self.disaster_needs = []
        
        # Demo city zones
        self.zones = ["north", "central", "south"]
        self.zip_codes = ["12345", "12346", "12347", "12348", "12349"]
        random.seed(42)
        
    def generate_all_seed_data(self) -> Dict[str, List[Any]]:
        """Generate complete seed dataset."""
        print("Generating seed data for single city district demo...")
        
        # Generate in dependency order
        self._generate_users()
        self._generate_organizations()
        self._generate_volunteers()
        self._generate_inventory()
        self._generate_requests()
        self._generate_disaster_fixture()
        
        return {
            "users": self.users,
            "organizations": self.organizations,
            "volunteers": self.volunteers,
            "inventory": self.inventory,
            "requests": self.requests,
            "disasters": self.disasters,
            "disaster_needs": self.disaster_needs,
        }
    
    def _generate_users(self) -> None:
        """Generate user data."""
        demo_password_hash = hash_password(DEFAULT_DEMO_PASSWORD)

        # Seeded admin account. Never created through signup - see
        # docs/AUTH_PLAN.md. Admins implicitly have coordinator access too.
        self.users.append(User(
            user_id="user_admin_demo",
            account_type=AccountType.ADMIN,
            name="NeighborNet Admin",
            email="admin@neighbornet.org",
            phone="555-0100",
            password_hash=demo_password_hash,
            email_verified=True,
        ))

        # Coordinators (granted the capability directly since they're seed
        # data, not signups going through the admin-approval flow).
        self.users.extend([
            User(
                name="Sarah Chen",
                email="sarah.chen@neighbornet.org",
                phone="555-0101",
                capabilities=UserCapabilities(is_coordinator=True),
                password_hash=demo_password_hash,
                email_verified=True,
                permissions={"approve_allocations": True, "manage_volunteers": True}
            ),
            User(
                name="Michael Rodriguez",
                email="m.rodriguez@neighbornet.org",
                phone="555-0102",
                capabilities=UserCapabilities(is_coordinator=True),
                password_hash=demo_password_hash,
                email_verified=True,
                permissions={"approve_allocations": True, "emergency_override": True}
            )
        ])

        # Volunteer users (will be referenced by Volunteer models)
        volunteer_names = [
            "Emma Johnson", "David Kim", "Lisa Thompson", "Carlos Mendez",
            "Jennifer Wu", "Robert Taylor", "Amanda Foster", "James Wilson",
            "Maria Gonzalez", "Kevin O'Brien", "Samantha Lee", "Daniel Brown",
            "Rachel Green", "Christopher Davis", "Ashley Martinez", "Steven Clark",
            "Nicole Anderson", "Jonathan White", "Stephanie Harris"
        ]

        for name in volunteer_names:
            email = name.lower().replace(" ", ".") + "@email.com"
            self.users.append(User(
                name=name,
                email=email,
                phone=f"555-{random.randint(1000, 9999)}",
                capabilities=UserCapabilities(is_volunteer=True),
                password_hash=demo_password_hash,
                email_verified=True,
            ))

        # Donor organization contacts
        donor_contacts = [
            "Patricia Adams", "Mark Thompson", "Rebecca Lewis",
            "Anthony Garcia", "Michelle Moore"
        ]

        for name in donor_contacts:
            email = name.lower().replace(" ", ".") + "@restaurant.com"
            self.users.append(User(
                name=name,
                email=email,
                phone=f"555-{random.randint(2000, 2999)}",
                capabilities=UserCapabilities(is_donor=True),
                password_hash=demo_password_hash,
                email_verified=True,
            ))
    
    def _generate_organizations(self) -> None:
        """Generate organization data."""
        
        # Shelters (recipients)
        shelters = [
            {
                "name": "Downtown Emergency Shelter",
                "address": "123 Main Street",
                "zone": "central",
                "zip_code": "12346",
                "capacity": 150,
                "dietary": ["vegetarian", "halal"]
            },
            {
                "name": "Family Haven Shelter",
                "address": "456 Oak Avenue", 
                "zone": "north",
                "zip_code": "12345",
                "capacity": 80,
                "dietary": ["vegetarian", "gluten_free"]
            },
            {
                "name": "Veterans Support Center",
                "address": "789 Pine Road",
                "zone": "south", 
                "zip_code": "12347",
                "capacity": 60,
                "dietary": ["diabetic_friendly"]
            }
        ]
        
        for shelter_data in shelters:
            org = Organization(
                name=shelter_data["name"],
                type=OrganizationType.SHELTER,
                contact_person="Facility Manager",
                phone=f"555-{random.randint(3000, 3999)}",
                email=f"{shelter_data['name'].lower().replace(' ', '.')}@shelter.org",
                location=Location(
                    address=shelter_data["address"],
                    zip_code=shelter_data["zip_code"],
                    zone=shelter_data["zone"],
                    accessible_by_vehicle=True,
                    parking_available=True
                ),
                operating_hours=OperatingHours(
                    monday={"start": "07:00", "end": "22:00"},
                    tuesday={"start": "07:00", "end": "22:00"}, 
                    wednesday={"start": "07:00", "end": "22:00"},
                    thursday={"start": "07:00", "end": "22:00"},
                    friday={"start": "07:00", "end": "22:00"},
                    saturday={"start": "08:00", "end": "20:00"},
                    sunday={"start": "08:00", "end": "20:00"}
                ),
                capacity_limits={"max_daily_meals": shelter_data["capacity"]},
                dietary_accommodations=shelter_data["dietary"],
                verified=True
            )
            self.organizations.append(org)
        
        # Food banks (recipients)
        food_banks = [
            {
                "name": "Community Food Hub",
                "address": "321 Community Drive",
                "zone": "central",
                "zip_code": "12346"
            },
            {
                "name": "Northside Pantry",
                "address": "654 Riverside Way",
                "zone": "north", 
                "zip_code": "12345"
            }
        ]
        
        for bank_data in food_banks:
            org = Organization(
                name=bank_data["name"],
                type=OrganizationType.FOOD_BANK,
                contact_person="Distribution Coordinator",
                phone=f"555-{random.randint(4000, 4999)}",
                email=f"{bank_data['name'].lower().replace(' ', '.')}@foodbank.org",
                location=Location(
                    address=bank_data["address"],
                    zip_code=bank_data["zip_code"], 
                    zone=bank_data["zone"],
                    accessible_by_vehicle=True,
                    loading_dock=True,
                    parking_available=True
                ),
                operating_hours=OperatingHours(
                    monday={"start": "09:00", "end": "17:00"},
                    tuesday={"start": "09:00", "end": "17:00"},
                    wednesday={"start": "09:00", "end": "17:00"},
                    thursday={"start": "09:00", "end": "17:00"},
                    friday={"start": "09:00", "end": "17:00"},
                    saturday={"start": "10:00", "end": "14:00"}
                ),
                dietary_accommodations=["vegetarian", "vegan", "gluten_free"],
                verified=True
            )
            self.organizations.append(org)

        # Relief point for disaster-mode tasks.
        relief_point = Organization(
            org_id="org_relief_zone_b",
            name="Zone B Relief Point",
            type=OrganizationType.NONPROFIT,
            contact_person="Relief Lead",
            phone="555-7400",
            email="zoneb.relief@neighbornet.org",
            location=Location(
                address="88 Harbor Relief Road",
                zip_code="12348",
                zone="south",
                accessible_by_vehicle=True,
                parking_available=True,
            ),
            operating_hours=OperatingHours(
                monday={"start": "06:00", "end": "22:00"},
                tuesday={"start": "06:00", "end": "22:00"},
                wednesday={"start": "06:00", "end": "22:00"},
                thursday={"start": "06:00", "end": "22:00"},
                friday={"start": "06:00", "end": "22:00"},
                saturday={"start": "06:00", "end": "22:00"},
                sunday={"start": "06:00", "end": "22:00"},
            ),
            dietary_accommodations=["vegetarian", "vegan", "gluten_free"],
            verified=True,
        )
        self.organizations.append(relief_point)
        
        # Restaurants (donors)
        restaurants = [
            {"name": "Golden Dragon Restaurant", "zone": "central"},
            {"name": "Maria's Italian Kitchen", "zone": "north"},
            {"name": "Sunset Grill", "zone": "south"},
            {"name": "Green Garden Cafe", "zone": "central"},
            {"name": "Corner Deli & More", "zone": "north"}
        ]
        
        for i, restaurant_data in enumerate(restaurants):
            org = Organization(
                name=restaurant_data["name"],
                type=OrganizationType.RESTAURANT,
                contact_person=f"Manager {chr(65+i)}",
                phone=f"555-{random.randint(5000, 5999)}",
                email=f"{restaurant_data['name'].lower().replace(' ', '.')}@restaurant.com",
                location=Location(
                    address=f"{100+i*50} Business Street",
                    zip_code=random.choice(self.zip_codes),
                    zone=restaurant_data["zone"],
                    accessible_by_vehicle=True,
                    parking_available=True
                ),
                operating_hours=OperatingHours(
                    monday={"start": "11:00", "end": "22:00"},
                    tuesday={"start": "11:00", "end": "22:00"},
                    wednesday={"start": "11:00", "end": "22:00"},
                    thursday={"start": "11:00", "end": "22:00"},
                    friday={"start": "11:00", "end": "23:00"},
                    saturday={"start": "12:00", "end": "23:00"},
                    sunday={"start": "12:00", "end": "21:00"}
                ),
                special_requirements={"pickup_window": "30_minutes"},
                verified=True
            )
            self.organizations.append(org)
    
    def _generate_volunteers(self) -> None:
        """Generate volunteer data."""
        volunteer_users = [u for u in self.users if u.capabilities.is_volunteer]
        
        for i, user in enumerate(volunteer_users):
            # Create varied volunteer profiles
            has_vehicle = random.choice([True, True, False])  # 2/3 have vehicles
            
            # Generate availability (most volunteers available evenings/weekends)
            availability = VolunteerAvailability()
            
            # Weekend availability (most volunteers)
            if random.random() > 0.2:  # 80% available weekends
                availability.saturday = [
                    AvailabilitySlot(start_time=time(9, 0), end_time=time(17, 0))
                ]
                availability.sunday = [
                    AvailabilitySlot(start_time=time(10, 0), end_time=time(16, 0))
                ]
            
            # Weekday evening availability
            if random.random() > 0.4:  # 60% available weekday evenings
                evening_slot = AvailabilitySlot(start_time=time(17, 0), end_time=time(20, 0))
                availability.monday = [evening_slot]
                availability.wednesday = [evening_slot]
                availability.friday = [evening_slot]
            
            # Some full-time available volunteers
            if random.random() > 0.85:  # 15% available during business hours
                day_slot = AvailabilitySlot(start_time=time(9, 0), end_time=time(17, 0))
                availability.tuesday = [day_slot]
                availability.thursday = [day_slot]
            
            volunteer = Volunteer(
                user_id=user.user_id,
                name=user.name,
                phone=user.phone,
                email=user.email,
                has_vehicle=has_vehicle,
                vehicle_type=random.choice(["car", "SUV", "truck", "van"]) if has_vehicle else None,
                max_carry_capacity=random.randint(20, 100) if has_vehicle else random.randint(5, 30),
                food_handling_certified=random.choice([True, False]),
                languages=random.choice([["English"], ["English", "Spanish"], ["English", "Mandarin"]]),
                special_skills=random.sample(
                    ["driving", "lifting", "organizing", "customer_service", "navigation"], 
                    random.randint(1, 3)
                ),
                skills=random.sample(
                    [
                        "food_delivery",
                        "logistics",
                        "driving",
                        "packing",
                        "distribution",
                        "first_aid_certified",
                    ],
                    random.randint(2, 4),
                ),
                verified=random.random() > 0.1,
                preferred_zones=random.sample(self.zones, random.randint(1, 2)),
                preferred_service_area=random.choice(self.zones),
                last_known_zone=random.choice(self.zones),
                max_travel_distance=random.randint(5, 25),
                availability=availability,
                total_deliveries=random.randint(0, 50),
                reliability_score=random.uniform(0.7, 1.0),
                availability_status="available",
                notification_status="reachable",
                current_task_count=random.randint(0, 2),
                preferred_delivery_types=random.choice([
                    ["prepared_meals"],
                    ["fresh_produce"], 
                    ["prepared_meals", "pantry_items"],
                    []  # No preference
                ])
            )
            
            # Fix successful_deliveries calculation after creation
            volunteer.successful_deliveries = random.randint(
                int(volunteer.total_deliveries * 0.8), 
                volunteer.total_deliveries
            )
            
            self.volunteers.append(volunteer)
    
    def _generate_inventory(self) -> None:
        """Generate inventory data."""
        donor_orgs = [org for org in self.organizations if org.type == OrganizationType.RESTAURANT]
        
        # Prepared meals from restaurants
        meal_types = [
            {"desc": "Chicken Teriyaki with Rice", "servings": 1, "calories": 450},
            {"desc": "Vegetable Stir Fry", "servings": 1, "calories": 350, "vegetarian": True},
            {"desc": "Beef Stew with Bread", "servings": 1, "calories": 500},
            {"desc": "Mediterranean Pasta Salad", "servings": 1, "calories": 400, "vegetarian": True},
            {"desc": "Grilled Salmon with Vegetables", "servings": 1, "calories": 520},
            {"desc": "Lentil Curry", "servings": 1, "calories": 380, "vegan": True},
            {"desc": "Turkey Sandwich Meal", "servings": 1, "calories": 420},
            {"desc": "Quinoa Buddha Bowl", "servings": 1, "calories": 390, "vegan": True, "gluten_free": True}
        ]
        
        base_time = datetime.now()
        
        for org in donor_orgs:
            # Each restaurant provides 15-25 prepared meals
            for _ in range(random.randint(15, 25)):
                meal = random.choice(meal_types)
                
                # Most meals expire within 24-48 hours
                expiry = base_time + timedelta(hours=random.randint(6, 48))
                
                dietary_info = DietaryMetadata(
                    vegetarian=meal.get("vegetarian", False),
                    vegan=meal.get("vegan", False),
                    gluten_free=meal.get("gluten_free", False),
                    calories_per_serving=meal.get("calories"),
                    servings=meal.get("servings", 1)
                )
                
                batch = InventoryBatch(
                    resource_type=ResourceType.PREPARED_MEAL,
                    quantity_available=random.randint(5, 20),
                    description=meal["desc"],
                    unit="meals",
                    expiry_datetime=expiry,
                    donor_org_id=org.org_id,
                    location_id=org.org_id,  # Stored at restaurant initially
                    dietary_metadata=dietary_info,
                    temperature_requirements="refrigerated",
                    quality_checked=True,
                    status=InventoryStatus.AVAILABLE
                )
                self.inventory.append(batch)
        
        # Fresh produce
        produce_items = [
            {"desc": "Fresh Apples", "unit": "pounds"},
            {"desc": "Bananas", "unit": "pounds"},
            {"desc": "Carrots", "unit": "pounds"}, 
            {"desc": "Lettuce Heads", "unit": "heads"},
            {"desc": "Tomatoes", "unit": "pounds"},
            {"desc": "Potatoes", "unit": "pounds"},
            {"desc": "Onions", "unit": "pounds"},
            {"desc": "Bell Peppers", "unit": "pounds"}
        ]
        
        # Simulate grocery store donations
        for _ in range(20):
            produce = random.choice(produce_items)
            donor_org = random.choice(donor_orgs)  # Restaurants sometimes donate produce too
            
            # Produce expires in 3-7 days
            expiry = base_time + timedelta(days=random.randint(3, 7))
            
            dietary_info = DietaryMetadata(
                vegetarian=True,
                vegan=True,
                gluten_free=True
            )
            
            batch = InventoryBatch(
                resource_type=ResourceType.FRESH_PRODUCE,
                quantity_available=random.randint(10, 50),
                description=produce["desc"],
                unit=produce["unit"],
                expiry_datetime=expiry,
                donor_org_id=donor_org.org_id,
                location_id=donor_org.org_id,
                dietary_metadata=dietary_info,
                temperature_requirements="refrigerated",
                quality_checked=True,
                status=InventoryStatus.AVAILABLE
            )
            self.inventory.append(batch)
        
        # Pantry items (longer shelf life)
        pantry_items = [
            {"desc": "Canned Soup", "unit": "cans"},
            {"desc": "Pasta", "unit": "boxes"},
            {"desc": "Rice", "unit": "pounds"},
            {"desc": "Peanut Butter", "unit": "jars"},
            {"desc": "Cereal", "unit": "boxes"},
            {"desc": "Canned Vegetables", "unit": "cans"},
            {"desc": "Bread Loaves", "unit": "loaves"}
        ]
        
        for _ in range(25):
            item = random.choice(pantry_items)
            donor_org = random.choice(donor_orgs)
            
            # Pantry items last weeks to months
            expiry = base_time + timedelta(days=random.randint(30, 365))
            
            dietary_info = DietaryMetadata()
            if "peanut" in item["desc"].lower():
                dietary_info.allergens = ["nuts"]
            
            batch = InventoryBatch(
                resource_type=ResourceType.PANTRY_ITEM,
                quantity_available=random.randint(5, 30),
                description=item["desc"],
                unit=item["unit"],
                expiry_datetime=expiry,
                donor_org_id=donor_org.org_id,
                location_id=donor_org.org_id,
                dietary_metadata=dietary_info,
                temperature_requirements="room_temp",
                quality_checked=True,
                status=InventoryStatus.AVAILABLE
            )
            self.inventory.append(batch)
    
    def _generate_requests(self) -> None:
        """Generate request data."""
        recipient_orgs = [org for org in self.organizations if org.type in [OrganizationType.SHELTER, OrganizationType.FOOD_BANK]]
        
        base_time = datetime.now()
        
        for org in recipient_orgs:
            # Each organization has 3-8 active requests
            for _ in range(random.randint(3, 8)):
                resource_type = random.choice([
                    ResourceType.PREPARED_MEAL,
                    ResourceType.FRESH_PRODUCE, 
                    ResourceType.PANTRY_ITEM
                ])
                
                # Request timing
                required_by = base_time + timedelta(hours=random.randint(4, 72))
                
                # Delivery window around meal times for prepared meals
                if resource_type == ResourceType.PREPARED_MEAL:
                    if required_by.hour < 12:  # Morning delivery
                        window_start = required_by.replace(hour=11, minute=30)
                        window_end = required_by.replace(hour=13, minute=0)
                    elif required_by.hour < 18:  # Afternoon delivery  
                        window_start = required_by.replace(hour=17, minute=0)
                        window_end = required_by.replace(hour=19, minute=30)
                    else:  # Evening delivery
                        window_start = required_by.replace(hour=18, minute=0)
                        window_end = required_by.replace(hour=20, minute=0)
                else:
                    # More flexible for non-meal items
                    window_start = required_by - timedelta(hours=4)
                    window_end = required_by + timedelta(hours=2)
                
                delivery_window = DeliveryWindow(
                    start=window_start,
                    end=window_end,
                    flexible=random.choice([True, False])
                )
                
                # Dietary restrictions based on organization
                dietary_restrictions = DietaryMetadata()
                if "halal" in org.dietary_accommodations:
                    dietary_restrictions.halal = True
                if "vegetarian" in org.dietary_accommodations:
                    dietary_restrictions.vegetarian = random.choice([True, False])
                if "gluten_free" in org.dietary_accommodations:
                    dietary_restrictions.gluten_free = random.choice([True, False])
                
                # Urgency based on timing and organization type
                if required_by < base_time + timedelta(hours=6):
                    urgency = UrgencyLevel.HIGH
                elif required_by < base_time + timedelta(hours=12):
                    urgency = UrgencyLevel.MEDIUM  
                else:
                    urgency = UrgencyLevel.LOW
                
                # Critical urgency for shelters with immediate needs
                if org.type == OrganizationType.SHELTER and random.random() > 0.9:
                    urgency = UrgencyLevel.CRITICAL
                
                request = Request(
                    requesting_org_id=org.org_id,
                    resource_type=resource_type,
                    quantity_requested=random.randint(10, 100),
                    urgency_level=urgency,
                    required_by=required_by,
                    delivery_window=delivery_window,
                    dietary_restrictions=dietary_restrictions,
                    purpose=random.choice([
                        "Daily meal service",
                        "Emergency distribution",
                        "Weekend food program", 
                        "Weekly pantry restock",
                        "Special event meal"
                    ]),
                    recipient_count=random.randint(20, org.capacity_limits.get("max_daily_meals", 100)),
                    contact_person=org.contact_person,
                    contact_phone=org.phone,
                    status=RequestStatus.PENDING
                )
                
                self.requests.append(request)

    def _generate_disaster_fixture(self) -> None:
        """Generate deterministic flood fixture for the unified demo."""
        disaster = DisasterEvent(
            disaster_id="disaster_flood_zone_b",
            type="flood",
            title="Flood detected in Zone B",
            description="High-water warning near Zone B with relief logistics needs.",
            affected_location={
                "address": "Zone B River Crossing",
                "zone": "south",
                "lat": 6.9271,
                "lng": 79.8612,
            },
            affected_zones=["south"],
            severity=TaskPriority.HIGH,
            status="active",
            created_by="user_admin_demo",
        )

        needs = [
            DisasterNeed(
                need_id="need_zone_b_food",
                disaster_id=disaster.disaster_id,
                category="food_delivery",
                quantity=20,
                priority=TaskPriority.HIGH,
                location={"zone": "south", "destination": "Zone B Relief Point"},
                required_skills=["food_delivery", "driving"],
                required_capacity=20,
            ),
            DisasterNeed(
                need_id="need_zone_b_water",
                disaster_id=disaster.disaster_id,
                category="water_distribution",
                quantity=30,
                priority=TaskPriority.HIGH,
                location={"zone": "south", "destination": "Zone B Relief Point"},
                required_skills=["logistics", "distribution"],
                required_capacity=30,
            ),
            DisasterNeed(
                need_id="need_zone_b_shelter",
                disaster_id=disaster.disaster_id,
                category="shelter_support",
                quantity=10,
                priority=TaskPriority.MEDIUM,
                location={"zone": "south", "destination": "Downtown Emergency Shelter"},
                required_skills=["packing", "distribution"],
                required_capacity=10,
            ),
        ]

        disaster.needs = needs
        self.disasters.append(disaster)
        self.disaster_needs.extend(needs)


_CACHED_SEED_DATA = None


def generate_seed_data() -> Dict[str, List[Any]]:
    """Generate and return complete seed dataset."""
    global _CACHED_SEED_DATA
    if _CACHED_SEED_DATA is not None:
        return deepcopy(_CACHED_SEED_DATA)

    generator = SeedDataGenerator()
    _CACHED_SEED_DATA = generator.generate_all_seed_data()
    return deepcopy(_CACHED_SEED_DATA)


if __name__ == "__main__":
    # For testing
    data = generate_seed_data()
    print(f"Generated seed data:")
    print(f"  Users: {len(data['users'])}")
    print(f"  Organizations: {len(data['organizations'])}")
    print(f"  Volunteers: {len(data['volunteers'])}")
    print(f"  Inventory batches: {len(data['inventory'])}")
    print(f"  Requests: {len(data['requests'])}")
