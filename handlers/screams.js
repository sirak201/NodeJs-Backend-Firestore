const { db } = require("../utility/admin");

exports.getAllScreams = (req, res) => {
  db.collection("screams")
    .orderBy("createdAt", "desc")
    .get()
    .then(data => {
      let screams = [];
      data.forEach(doc => {
        screams.push({
          screamId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          userImage: doc.data().userImage,
          likeCount : doc.data().likeCount,
          commentCount : doc.data().commentCount
        });
      });

      return res.json(screams);
    })
    .catch(err => console.error(err));
};

exports.postOneScream = (req, res) => {
  const scream = {
    body: req.body.body,
    createdAt: new Date().toDateString(),
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
    likeCount: 0,
    commentCount: 0
  };
  db.collection("screams")
    .add(scream)
    .then(doc => {
      const resScream = scream;
      resScream.screamId = doc.id;

      res.json(resScream);
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({
        error: "Error took place"
      });
    });
};

exports.getScream = (req, res) => {
  let screamData = {};
  db.doc(`/screams/${req.params.screamId}`)
    .get()
    .then(doc => {
      if (!doc.exists)
        return res.status(404).json({ error: "Scream not found" });

      screamData = doc.data();
      screamData.screamId = doc.id;

      return db
        .collection("comments")
        .orderBy("createdAt", "desc")
        .where("screamId", "==", req.params.screamId)
        .get()
        .then(data => {
          screamData.comments = [];
          data.forEach(doc => {
            screamData.comments.push(doc.data());
          });
          return res.json(screamData);
        })
        .catch(err => {
          console.log(err);
          return res.status(500).json({ error: err.code });
        });
    });
};

exports.commentOnScream = (req, res) => {
  if (req.body.body.trim() === "")
    return res.status(400).json({ comment: "Must not be empy" });

  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    screamId: req.params.screamId,
    userHandle: req.user.handle
    // userImage: req.user.imageUrl
  };

  db.doc(`/screams/${req.params.screamId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res
          .status(404)
          .json({ error: "Scream you are trying to comment no longer exist" });
      }
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    })
    .then(() => {
      return db.collection("comments").add(newComment);
    })
    .then(doc => {
      return res.json(newComment);
    })

    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: err });
    });
};

exports.likeScream = (req, res) => {
  const likeDcument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("screamId", "==", req.params.screamId)
    .limit(1);

  const screamDocument = db.doc(`/screams/${req.params.screamId}`);

  let screamData = {};

  screamDocument
    .get()
    .then(doc => {
      if (doc.exists) {
        screamData = doc.data();
        screamData.screamId = doc.id;
        return likeDcument.get();
      } else {
        return res.status(404).json({ error: "Scream not found" });
      }
    })
    .then(data => {
      if (data.empty) {
        return db
          .collection("likes")
          .add({
            screamId: req.params.screamId,
            userHandle: req.user.handle
          })

          .then(() => {
            screamData.likeCount++;
            return screamDocument.update({ likeCount: screamData.likeCount });
          })
          .then(() => {
            return res.json(screamData);
          });
      } else {
        return res
          .status(400)
          .json({ error: "Scream has already been incremented " });
      }
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: err });
    });
};

exports.unlikeScream = (req, res) => {
  const likeDcument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("screamId", "==", req.params.screamId)
    .limit(1);

  const screamDocument = db.doc(`/screams/${req.params.screamId}`);

  let screamData = {};

  screamDocument
    .get()
    .then(doc => {
      if (doc.exists) {
        screamData = doc.data();
        screamData.screamId = doc.id;
        return likeDcument.get();
      } else {
        return res.status(404).json({ error: "Scream not found" });
      }
    })
    .then(data => {
      if (data.empty) {
        return res
          .status(400)
          .json({ error: "Scream has not been liked yet " });
      } else {
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            screamData.likeCount--;
            return screamDocument.update({ likeCount: screamData.likeCount });
          })
          .then(() => {
            return res.json(screamData);
          });
      }
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: err });
    });
};

exports.deleteScream = (req, res) => {
  const document = db.doc(`/screams/${req.params.screamId}`);

  console.log("handles ", req.user.handle);

  document
    .get()
    .then(doc => {
      if (!doc.exists) {
        res.status(404).json({ Error: "Scream does not exist" });
      }

      if (doc.data().userHandle !== req.user.handle) {
        return res.status(403).json({ error: "Unauthorized" });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: "Scream has been delted" });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
