from pymongo import MongoClient

_client = MongoClient("mongodb://localhost:27017/")
db = _client["sa_crime"]
