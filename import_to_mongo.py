"""
MongoDB Import Script for IPL Analytics Project
Imports IPL.csv.gz into MongoDB database 'ipl_analytics', collection 'deliveries'
and creates query indexes for fast performance.
"""

import os
import pandas as pd
from pymongo import MongoClient

DATASET_PATH = None
for _p in ["IPL.csv.gz", "ipl.csv.gz", "IPL.csv", "ipl.csv"]:
    if os.path.exists(_p):
        DATASET_PATH = _p
        break

if not DATASET_PATH:
    raise FileNotFoundError("IPL dataset file (IPL.csv.gz or IPL.csv) not found!")

print(f"Reading IPL dataset from {DATASET_PATH}...")
df = pd.read_csv(DATASET_PATH, low_memory=False)

# Clean NaN values for BSON / MongoDB compatibility
df = df.where(pd.notnull(df), None)

print("Connecting to local MongoDB (mongodb://localhost:27017/)...")
try:
    client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=3000)
    # Test connection
    client.admin.command('ping')
    print("MongoDB connection successful!")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
    print("Please make sure MongoDB Community Server is installed and running locally on port 27017.")
    exit(1)

db = client["ipl_analytics"]
collection = db["deliveries"]

print("Clearing existing collection 'deliveries'...")
collection.drop()

print(f"Inserting {len(df)} delivery records into MongoDB collection 'deliveries'...")
records = df.to_dict("records")

# Insert in chunks of 50,000 for efficiency
CHUNK_SIZE = 50000
for i in range(0, len(records), CHUNK_SIZE):
    chunk = records[i:i + CHUNK_SIZE]
    collection.insert_many(chunk)
    print(f"  Inserted {i + len(chunk)} / {len(records)} records...")

print("Creating database indexes for fast query performance...")
collection.create_index("batter")
collection.create_index("bowler")
collection.create_index("match_id")
collection.create_index("venue_clean")
collection.create_index("year")
collection.create_index("season")

print("MongoDB Import Completed Successfully!")
print(f"Total documents stored in ipl_analytics.deliveries: {collection.count_documents({})}")
