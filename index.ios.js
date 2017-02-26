import React, { Component } from 'react'
import {
    AppRegistry,
    Dimensions,
    ActivityIndicator,
    StyleSheet,
    TouchableHighlight,
    Text,
    View
} from 'react-native'
import Camera from 'react-native-camera'
import AWSUtils from './AWSUtils.js'
import RNFS from 'react-native-fs'

export default class CivisFace extends Component {
    constructor(props) {
        super(props)

        // our state is simple--it just holds a message
        // to display to the user and a spinner bool
        this.state = {
            messageText: null,
            spinning: false
        }

        this.handleMessage = this.handleMessage.bind(this)
        this.setSpinner = this.setSpinner.bind(this)

    }

    // we'll pass this handler down so that we can
    // surface messages back up...
    handleMessage(messageText) {
        this.setState({
            messageText: messageText
        })
    }

    // ...and this one to handle the spinner...
    setSpinner(spinning) {
        this.setState({
            spinning: spinning
        })
    }

    messageArea() {
        if(this.state.messageText !== null){
            return <Text style={styles.message}>{this.state.messageText}</Text>
        } else {
            return <Text style={styles.empty}></Text>
        }
    }

    captureButton() {
        if(!this.state.spinning){
            return <Text style={styles.capture} onPress={this.takePicture.bind(this)}>[CAPTURE]</Text>
        } else {
            return <Text style={styles.empty}></Text>
        }
    }

    render() {
        return (
            <View style={styles.container}>
              <Camera ref={(cam) => { this.camera = cam }} style={styles.preview}
                      aspect={Camera.constants.Aspect.fill}>
                <ActivityIndicator animating={this.state.spinning} size="large" color="#ffc425"/>
                {this.messageArea()}
                {this.captureButton()}
              </Camera>
            </View>
        )
    }

    takePicture() {
        this.setSpinner(true)
        let aws = new AWSUtils()
        // capture photos in "temp" mode so that we don't clutter up the
        // camera roll
        let cameraParams = {target: Camera.constants.CaptureTarget.temp,
                            type: Camera.constants.Type.front,
                            flashMode: Camera.constants.FlashMode.auto}
        this.camera.capture(cameraParams).then((data) => {
            this.handleMessage("Getting photo...")
            RNFS.readFile(data.path, 'base64').then(img => {
                console.log("Matching the face...")
                this.handleMessage("Matching face...")
                aws.matchFace(img, this.handleMessage, this.setSpinner)
            }).catch(err => {
                console.error(err)
                this.setSpinner(true)
            })
        }).catch(err => {
            console.error(err)
            this.setSpinner(true)
        })
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    preview: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        height: Dimensions.get('window').height,
        width: Dimensions.get('window').width
    },
    capture: {
        flex: 0,
        backgroundColor: '#fff',
        borderRadius: 5,
        color: '#000',
        fontWeight: 'bold',
        padding: 10,
        margin: 40
    },
    message: {
        flex: 0,
        backgroundColor: '#fff',
        borderRadius: 5,
        color: '#ffc425',
        fontWeight: 'bold',
        padding: 10,
        margin: 40
    },
    empty: {
        flex: 0,
        backgroundColor: 'rgba(0,0,0,0)',
        borderRadius: 5,
        padding: 10,
        margin: 40
    },
    centering: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8
    }
})

AppRegistry.registerComponent('CivisFace', () => CivisFace)
