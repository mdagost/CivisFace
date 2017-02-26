import Crypto from 'crypto-js'
import moment from 'moment'
import fs from 'react-native-fs'
import Sound from 'react-native-sound'
import uuidMap from './uuid_to_person_map.json'
import RNFetchBlob from 'react-native-fetch-blob'
import base64 from 'base-64'
import secrets from './secrets.json'

export default class AWSUtils {

    // this function will take a text string, send it to AWS Polly text-to-speech, and
    // play the returned mp3 file
    textToSpeech(whatToSay, messageHandler, attemptCount=0) {
        if(attemptCount > 10){
            console.log('Tried 10 times but it didn\'t work!!')
            messageHandler('Tried 10 times but it didn\'t work!!')
            return
        }

        let body = {OutputFormat: 'mp3',
                    Text: whatToSay,
                    TextType: 'text',
                    VoiceId: 'Joanna'}
        let additionalHeaders = {'Content-Type': 'x-www-form-urlencoded'}
        let requestPromise = this.makeSignedAWSRequest('POST', 'polly', 'polly.us-east-1.amazonaws.com',
                                                       'us-east-1', '/v1/speech',
                                                       body, additionalHeaders, true)
        let that = this
        requestPromise.then(function(response){
            // catch this date format error from AWS and retry
            if(base64.decode(response.base64()).includes('ISO-8601')){
                console.log('Got an error from AWS about ISO-8601 dates.')
                console.log('Trying again...')
                messageHandler('Got an error from AWS but trying again ('+attemptCount+')...');
                // try again
                attemptCount += 1
                that.textToSpeech(whatToSay, messageHandler, attemptCount)
            } else {
                let mp3 = base64.decode(response.base64())
                // we have to convert to utf8 by hand
                // because of some insane craziness with
                // react-native-fs
                let utf8 = new Array(mp3.length)
                for (let i = 0; i < mp3.length; i++) {
                    utf8[i] = String.fromCharCode(mp3.charCodeAt(i))
                }

                let file = 'polly.mp3'
                let path = fs.TemporaryDirectoryPath + file
                fs.writeFile(path, utf8.join(''), 'ascii').then(function(){
                    console.log('Reading mp3 back from file...')
                    let polly = new Sound(path, '', (error) => {
                        if (error) {
                            console.log('Failed to load the mp3.', error)
                            messageHandler('Failed to load the mp3: '+error)
                        } else {
                            console.log('Playing mp3...')
                            messageHandler('Saying it...')
                            polly.play(function(success){
                                messageHandler(null)
                            })
                        }
                    })
                })
            }
        }).catch(function(err, status){
            console.log('Got an error from AWS.  Response:')
            console.log(err)
            console.log('Trying again...')
            messageHandler('Got an error from AWS but trying again ('+attemptCount+')...')
            // try again
            attemptCount += 1
            that.textToSpeech(whatToSay, messageHandler, attemptCount)
        })

    }

    // this function will take an image, send it to AWS Rekognition's face search endpoint, and
    // use text to speech to say hello if a match is found
    matchFace(imgBytes, messageHandler, setSpinner, attemptCount=0) {
        if(attemptCount > 10){
            console.log('Tried 10 times but it didn\'t work!!')
            messageHandler('Tried 10 times but it didn\'t work!!')
            setSpinner(false)
            this.textToSpeech('I\'m sorry.  Something went wrong.  Maybe that\'s not a face?', messageHandler)
            return
        }

        let body = {CollectionId: 'company-photos',
                    Image: {'Bytes': imgBytes}}
        let additionalHeaders = {'X-Amz-Target': 'RekognitionService.SearchFacesByImage',
                                 'Content-Type': 'application/x-amz-json-1.1'}
        let requestPromise = this.makeSignedAWSRequest('POST', 'rekognition', 'rekognition.us-east-1.amazonaws.com',
                                                       'us-east-1', '/',
                                                       body, additionalHeaders, false)
        let that = this
        requestPromise.then(function(response){
            if(response.status != 200){
                console.log('Got an error from AWS trying to match face.  Response:')
                console.log(response)
                // empirically, it seems that images that don't contain a face end up here
                messageHandler('I\'m sorry.  Something went wrong.  Maybe that\'s not a face?')
                setSpinner(false)
                that.textToSpeech('I\'m sorry.  Something went wrong.  Maybe that\'s not a face?', messageHandler)
                return
            } else {
                console.log('Worked!  Response:')
                response.json().then(function(json){
                    console.log(json)
                    // see if we got just one match
                    if('FaceMatches' in json && json.FaceMatches.length != 0){
                        console.log('Found '+json.FaceMatches.length+' matches.')

                        let people = []
                        let mostSimilarPerson = null
                        let highestSimilarity = 0
                        // loop over matches and get the uuid of our match...
                        for (let i = 0; i < json.FaceMatches.length; i++) {
                            // ...look up their name in our uuid map...
                            let match = uuidMap[json.FaceMatches[i].Face.ExternalImageId]
                            if(match){
                                people.push(match[0])
                                if(json.FaceMatches[i].Similarity > highestSimilarity){
                                    highestSimilarity = json.FaceMatches[i].Similarity
                                    mostSimilarPerson = match[0]
                                }
                            }
                        }
                        console.log(people)

                        if(people.length===1){
                            // ...and then say hello!
                            messageHandler('Figuring out what to say to '+people[0]+'...')
                            that.textToSpeech('Hello '+people[0]+'!!  It\'s nice to see you!!', messageHandler)
                        } else if(people.length>1){
                            messageHandler('Figuring out what to say to '+people.join(',')+'...')
                            let peopleMsg = people.slice(0, -1).join(',')+' or '+people.slice(-1)
                            peopleMsg += ', but I think that it\'s most likely '+mostSimilarPerson
                            that.textToSpeech('Hmmmm...I\'m not sure if that\'s '+peopleMsg, messageHandler)
                        } else {
                            messageHandler('Looks like I don\'t know this person...')
                                that.textToSpeech('Looks like I don\'t know this person...', messageHandler)
                        }
                    } else {
                        messageHandler('No matches found.')
                        that.textToSpeech('I\'m sorry.  I don\'t recognize you.', messageHandler)
                    }
                })
                setSpinner(false)
            }
        }).catch(function(err){
            console.log('ERROR ON THE REQUEST!!')
            console.log(err)
            messageHandler('Got a fatal error in matchFace: '+err)
            setSpinner(false)
        })
    }

    // this function and the following function implement proper request signing
    // for our AWS requests; see http://docs.aws.amazon.com/general/latest/gr/sigv4-signed-request-examples.html
    getSignatureKey(Crypto, key, dateStamp, regionName, serviceName) {
        let kDate = Crypto.HmacSHA256(dateStamp, 'AWS4' + key)
        let kRegion = Crypto.HmacSHA256(regionName, kDate)
        let kService = Crypto.HmacSHA256(serviceName, kRegion)
        let kSigning = Crypto.HmacSHA256('aws4_request', kService)
        return kSigning
    }

    makeSignedAWSRequest(method, service, host, region='us-east-1', canonicalUri, body, additionalHeaders, blob) {
        let awsAccessKeyId = secrets.awsAccessKeyId
        let awsSecretAccessKey = secrets.awsSecretAccessKey

        let endpoint = 'https://'+host+canonicalUri

        let now = moment()
        let dateStamp = moment.utc(now).format('YYYYMMDD')
        let amzdate = moment.utc(now).format('YYYYMMDD[T]HHmmss[Z]')

        let canonicalQueryString = ''
        let canonicalHeaders = 'host:' + host + '\n' + 'x-amz-date:' + amzdate + '\n'
        let signedHeaders = 'host;x-amz-date'

        let payloadHash = Crypto.SHA256(JSON.stringify(body)).toString()

        let canonicalRequest = method + '\n' + canonicalUri + '\n' + canonicalQueryString + '\n'
        canonicalRequest += canonicalHeaders + '\n' + signedHeaders + '\n' + payloadHash

        let algorithm = 'AWS4-HMAC-SHA256'
        let credentialScope = dateStamp + '/' + region + '/' + service + '/' + 'aws4_request'
        let stringToSign = algorithm + '\n' +  amzdate + '\n' +  credentialScope + '\n'
        stringToSign +=  Crypto.SHA256(canonicalRequest).toString()

        let signingKey = this.getSignatureKey(Crypto, awsSecretAccessKey, dateStamp, region, service)
        let signature = Crypto.HmacSHA256(stringToSign, signingKey)

        let authorizationHeader = algorithm + ' ' + 'Credential=' + awsAccessKeyId + '/' + credentialScope
        authorizationHeader += ', ' +  'SignedHeaders=' + signedHeaders + ', ' + 'Signature=' + signature

        // general headers common to all requests
        let headers = {Host: host,
                       'X-Amz-Date': amzdate,
                       Authorization: authorizationHeader}
        // add in any additional headers specific for this request
        for(key in additionalHeaders){
            headers[key] = additionalHeaders[key]
        }

        // if we want this request to return a blob (sound file)
        // use RNFetchBlob because react-native's regular fetch
        // doesn't have a blob response like it does in the browser
        if(blob){
            return RNFetchBlob.fetch(method, endpoint,
                                     headers,
                                     JSON.stringify(body))
        } else {
            // axios doesn't have responseType 'stream' on react-native,
            // so use fetch instead
            return fetch(endpoint,
                         {method: method,
                          headers: headers,
                          body: JSON.stringify(body)
                         })
        }
    }

}
