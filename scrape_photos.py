import requests
import json
import uuid
import boto3

client = boto3.client('rekognition')

# store each person by a uuid instead of by name
uuid_to_person_map = {}

photo_link = ("https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/"
              "Official_portrait_of_Vice_President_Joe_Biden.jpg/"
              "1024px-Official_portrait_of_Vice_President_Joe_Biden.jpg")
name = "Joe Biden"
this_uuid = str(uuid.uuid4())
print("{} ({}):    {}".format(name, this_uuid, photo_link))

# update our mapping
uuid_to_person_map[this_uuid] = [name, photo_link]

# actually get the photo
photo = requests.get(photo_link)

# now load it into our rekognition collection
response = client.index_faces(
    CollectionId='company-photos',
    Image={
        'Bytes': photo.content
    },
    ExternalImageId=str(this_uuid)
)

# persist our uuid to photo mapping to a file
with open("uuid_to_person_map.json", 'w') as mapfile:
    mapfile.write(json.dumps(uuid_to_person_map))
