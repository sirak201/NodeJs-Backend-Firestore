const { db, admin } = require("../utility/admin");
const config = require("../utility/config");
const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails
} = require("../utility/validators");

const firebase = require("firebase");
firebase.initializeApp(config);

exports.signup = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    conformPassword: req.body.conformPassword,
    handle: req.body.handle,
    imageUrl: "noImageUrl"
  };

  const { valid, errors } = validateSignupData(newUser);

  if (!valid) return res.status(400).json(errors);

  let token, userId;
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        return res.status(400).json({
          handle: "This handle is already taken"
        });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password)
          .then(data => {
            userId = data.user.uid;
            return data.user.getIdToken();
          })
          .then(newToken => {
            token = newToken;

            const userCreduntials = {
              handle: newUser.handle,
              email: newUser.email,
              createdAt: new Date().toISOString(),
              userId: userId
            };

            return db
              .doc(`/users/${userCreduntials.handle}`)
              .set(userCreduntials);
          })
          .then(doc => {
            return res.status(201).json({
              token: token
            });
          })

          .catch(err => {
            if (err.code == "auth/email-already-in-use") {
              return res.status(400).json({
                error: "Email Already in use"
              });
            } else {
              return res.status(500).json({
                general: "Something went wrong, please try again"
              });
            }
          });
      }
    });
};

exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  };

  const { valid, errors } = validateLoginData(user);
  if (!valid) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken();
    })
    .then(signToken => {
      return res.json({ signToken });
    })
    .catch(err => {
      return res.status(403).json({
        general: "Wrong credentials, please try again"
      });
    });
};

// Upload info

exports.addUserDetails = (req, res) => {
  let userDetails = reduceUserDetails(req.body);

  console.log(userDetails);

  if (Object.keys(userDetails).length === 0)
    return res.json({ error: "Please update aleast one form" });
  db.doc(`/users/${req.user.handle}`)
    .update(userDetails)
    .then(() => {
      return res.json({ message: "Detail has been added sucesfully" });
    })
    .catch(err => {
      return res.status(500).json({ error: err.code });
    });
};

// UPLOAD IMAGE
exports.uploadImage = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busBoy = new BusBoy({ headers: req.headers });

  let imageFileName;
  let imageTobeUploaded = {};

  busBoy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Wrong file type submitted" });
    }
    const imageExtention = filename.split(".")[fieldname.split(".").length];

    imageFileName = `${Math.round(
      Math.random() * 100000000
    )}.${imageExtention}`;

    const filepath = path.join(os.tmpdir(), imageFileName);
    imageTobeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
    console.log("This is path", filepath);
  });

  busBoy.on("finish", () => {
    // var metadata = {
    //   contentType: imageTobeUploaded.mimetype
    // };
    // var uploadTask = firebase
    //   .storage()
    //   .ref()
    //   .put(imageTobeUploaded.filepath, metadata);
    // uploadTask.on(
    //   "state_changed",
    //   function(snapshot) {
    //     var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    //     console.log("Upload is " + progress + "% done");
    //     switch (snapshot.state) {
    //       case firebase.storage.TaskState.PAUSED: // or 'paused'
    //         console.log("Upload is paused");
    //         break;
    //       case firebase.storage.TaskState.RUNNING: // or 'running'
    //         console.log("Upload is running");
    //         break;
    //     }
    //   },
    //   function(error) {
    //     console.log("Error took place is ", error);
    //     // Handle unsuccessful uploads
    //   },
    //   function() {
    //     // Handle successful uploads on complete
    //     // For instance, get the download URL: https://firebasestorage.googleapis.com/...
    //     uploadTask.snapshot.ref.getDownloadURL().then(function(downloadURL) {
    //       console.log("File available at", downloadURL);
    //     });
    //   }
    // );
    // admin
    //   .storage()
    //   .bucket()
    //   .upload(imageTobeUploaded.filepath, {
    //     resumeable: false,
    //     metadata: {
    //       metadata: {
    //         contentType: imageTobeUploaded.mimetype
    //       }
    //     }
    //   })
    //   .then(() => {
    //     const imageUrl = `https://firebasestoreage.googleapis.com/v0/b/
    //     ${config.storageBucket}/o/${imageFileName}?alt=media`;
    //     return db.doc(`/users/${req.user.handle}`).update({
    //       imageUrl: imageUrl
    //     });
    //   })
    //   .then(() => {
    //     return res.json({ messahe: "Image Upload succesfully" });
    //   })
    //   .catch(err => {
    //     return res.error(err);
    //   });
  });

  busBoy.end(req.rawBody);
};

// get own User details
exports.getAuthenticatedUser = (req, res) => {
  let userData = {};

  db.doc(`/users/${req.user.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return db
          .collection("likes")
          .where("userHandle", "==", req.user.handle)
          .get();
      }
    })
    .then(data => {
      userData.likes = [];
      data.forEach(doc => {
        userData.likes.push(doc.data());
      });

      return db
        .collection("notfications")
        .where("recipient", "==", req.user.handle)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
    })
    .then(data => {
      userData.notifications = [];
      data.forEach(doc => {
        userData.notifications.push({
          createdAt: doc.data().createdAt,
          read: doc.data().read,
          recipent: doc.data().recipent,
          screamId: doc.data().screamId,
          sender: doc.data().sender,
          type: doc.data().type,
          notficationId: doc.id
        });
      });

      return res.json(userData);
    })

    .catch(err => {
      console.error(err);
      res.json(500).json({ error: err.code });
    });
};

// Get any user's Detail
exports.getUserDetails = (req, res) => {
  let userData = {};
  db.doc(`users/${req.params.handle}`)
    .get()
    .then(doc => {
      if (doc) {
        userData.user = doc.data();
        return db
          .collection("screams")
          .where("userHandle", "==", req.params.handle)
          .orderBy("createdAt", "desc")
          .get();
      } else {
        return res.status(404).json({ error: "User handle not found" });
      }
    })
    .then(data => {
      userData.screams = [];

      data.forEach(doc => {
        userData.screams.push({
          body: doc.data().body,
          createdAt: doc.data().createdAt,
          userHandle: doc.data().userHandle,
          userImage: doc.data().userImage,
          likeCount: doc.data().likeCount,
          commentCount: doc.data().commentCount,
          screamId: doc.id
        });
      });
      return res.json(userData);
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.markNotficationsRead = (req, res) => {
  let batch = db.batch();

  req.body.forEach(notficationId => {
    const notfication = db.doc(`/notfications/${notficationId}`);
    batch.update(notfication, { read: true });
  });

  batch
    .commit()
    .then(() => {
      return res.json({ message: "Notifcations marked read" });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
