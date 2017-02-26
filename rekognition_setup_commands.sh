# create a collection called "company-photos" that we'll use to do face search
aws rekognition create-collection --collection-id company-photos
# list our collections to make sure it was created
aws rekognition list-collections
