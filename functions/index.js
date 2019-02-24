const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);


exports.addWelcomeMessages = functions.auth.user().onCreate((user) => {
    console.log('A new user signed in for the first time.');
    const fullName = user.displayName || 'Anonym';

    return admin.database().ref('messages').push({
      name: 'Firebase Bot',
      photoUrl: '/assets/images/firebase-logo.png',
      text: `${fullName} signed in for the first time! Welcome!`
    });
  });


  exports.blurOffensiveImages = functions.storage.object().onFinalize((object) => {
    if (object.resourceState === 'not_exists') {
      return console.log('This is a deletion event.');
    } else if (!object.name) {
      return console.log('This is a deploy event.');
    }
  
    const messageId = object.name.split('/')[1];
  
    return admin.database().ref(`/messages/${messageId}/moderated`).once('value')
      .then((snapshot) => {
        // The image has already been moderated.
        if (snapshot.val()) {
          return;
        }
  
        // Check the image content using the Cloud Vision API.
        return visionClient.safeSearchDetection(`gs://${object.bucket}/${object.name}`);
      })
      .then((results) => {
        if (!results) {
          return;
        }
        const detections = results[0].safeSearchAnnotation;
        if (detections.adult || detections.violence) {
          console.log('The image', object.name, 'has been detected as inappropriate.');
          return blurImage(object);
        } else {
          console.log('The image', object.name, ' has been detected as OK.');
        }
      });
  });

  function blurImage(object) {
    const filePath = object.name;
    const bucket = storageClient.bucket(object.bucket);
    const fileName = filePath.split('/').pop();
    const tempLocalFile = `/tmp/${fileName}`;
    const messageId = filePath.split('/')[1];
  
    // Download file from bucket.
    return bucket
      .file(filePath)
      .download({ destination: tempLocalFile })
      .then(() => {
        console.log('Image has been downloaded to', tempLocalFile);
        // Blur the image using ImageMagick.
        return exec(`convert ${tempLocalFile} -channel RGBA -blur 0x24 ${tempLocalFile}`);
      })
      .then(() => {
        console.log('Image has been blurred');
        // Uploading the Blurred image back into the bucket.
        return bucket.upload(tempLocalFile, { destination: filePath });
      })
      .then(() => {
        console.log('Blurred image has been uploaded to', filePath);
        // Indicate that the message has been moderated.
        return admin.database().ref(`/messages/${messageId}`).update({ moderated: true });
      })
      .then(() => {
        console.log('Marked the image as moderated in the database.');
      });
  }

  