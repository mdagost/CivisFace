# Introduction 

This is an iOS app for exploring facial recognition using [react-native](https://facebook.github.io/react-native/), [AWS Rekognition](https://aws.amazon.com/rekognition/), and [AWS Polly](https://aws.amazon.com/polly/).  It was made to playfully recognize our employees around the office from their staff photos and to educate visitors on facial recognition technology.

**Note**: this is only a POC app useful for exploration and research.  It does some things which are non-ideal like embedding AWS credentials directly into the application itself, storing a uuid/name map in an embedded json file in the application rather than using a database, etc.  Please don't send this off to the AppStore.


**Click for a Demo Video:**

[![Demo](http://i3.ytimg.com/vi/hBKbCzUa5aA/hqdefault.jpg)](https://www.youtube.com/watch?v=hBKbCzUa5aA)

# Installation

1.  You'll need credentials for an AWS IAM role that has access to the Rekognition and Polly services.  Create a file called `secrets.json` that has the format `{"awsAccessKeyId": "INSERT_AWS_ACCESS_KEY_ID_HERE", "awsSecretAccessKey": "INSERT_AWS_SECRET_ACESS_KEY_HERE"}`.

2.  Create a Rekognition "face collection" using the AWS CLI by running the commands in `rekognition_setup_commands.sh`.

3.  Load some faces into the face collection.  You can see example code for doing that in `scrape_photos.py`, which will load a photo of [former Vice President (and all-around great guy) Joe Biden](https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Official_portrait_of_Vice_President_Joe_Biden.jpg/1024px-Official_portrait_of_Vice_President_Joe_Biden.jpg).  In our application, we scraped photos from our [company website team page](https://www.civisanalytics.com/about/our-team/) and from social media profiles provided by visitors to a special event in our office.

4.  Install node/npm if you don't have them already.  On a Mac, do `brew install node`.

5.  Install the react-native CLI: `npm install -g react-native-cli`.

6.  Compile and install the app:

```bash
cd CivisFace
npm install
```

# Usage

To check if things run, you can use the iOS simulator, but note that the simulator doesn't have access to a camera:

```bash
cd CivisFace
react-native run-ios
```

To actually run the app on an iPhone, you can follow instructions [here](https://facebook.github.io/react-native/docs/running-on-device.html).  **NOTE**: you'll need an Apple developer account and registered iPhone.  Open `ios/CivisFace.xcodeproj/project.pbxproj` in the XCode GUI and change the "Development Team" under the "Signing" section to your provisioning profile (you'll need to do this both for the project itself and for the main build target).  Then run the following from the commandline:

```bash
cd CivisFace
react-native run-ios --scheme CivisFace --configuration Release --device "NAME OF YOUR IPHONE"
```

# License

This code is licensed under BSD 3-clause.  Full license text is available in [LICENSE](LICENSE.txt).

# Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/civisanalytics/CivisFace.  This project is intended to be a safe, welcoming space for collaboration, and contributors are expected to adhere to the [Contributor Covenant](CODE_OF_CONDUCT.md) code of conduct.
