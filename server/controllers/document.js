const Document = require('../models/document');

module.exports = {
  // Create document with a unique title
  create: (req, res) => {
    const document = new Document();

    document.title = req.body.title;
    document.content = req.body.content;
    document.privacy = req.body.privacy;
    document._creatorId = req.decoded.id;
    document.sharewith = req.body.sharewith;
    document.access = req.body.access;

    document.save((err) => {
      if (err) {
        res.status(500).send({
          error: err,
          message: 'Document could not be created',
          status: '500: Internal Server Error',
        });
      } else {
        res.status(201).send({
          success: true,
          message: 'Document created successfully',
          status: '201: Resource Created',
          document: document,
        });
      }
    });
  },

  // Get all documents
  // [Restricted] Only able to get your documents and public documents
  getAll: (req, res) => {
    Document.find(
      {
        $or: [{ _creatorId: req.decoded.id }, { privacy: 'public' }],
      }
    )
    .sort('-createdAt')
    .skip(parseInt(req.query.offset, 10))
    .limit(parseInt(req.query.limit, 10))
    .exec((err, documents) => {
      if (err) {
        res.send(err);
      } else if (parseInt(req.query.offset, 10) > documents.length) {
        res.status(400).send({
          message: 'Offset greater than number of documents or limit param. Cannot fetch',
          status: '400: Bad request',
        });
      } else {
        res.status(200).send(documents);
      }
    });
  },

// [Restricted] Can only fetch documents of logged in user or public documents
  getDocumentById: (req, res) => {
    Document.find({
      $or: [
        { $and: [{ _id: req.params.document_id }, { privacy: 'public' }] },
        { $and: [{ _creatorId: req.decoded.id }, { _id: req.params.document_id }] },
      ],
    })
    .exec((err, documents) => {
      if (err) {
        res.send(err);
      } else if (documents.length === 0) {
        res.status(401).send({
          message: 'Cannot access document by that id',
          status: '401: Unauthorised',
        });
      } else {
        res.status(200).send(documents);
      }
    });
  },

  // [Restricted] Can only edit documents of logged in user
  updateDocumentById: (req, res) => {
    Document.findById(req.params.document_id)
    .where('_creatorId').equals(req.decoded.id)
    .exec((err, document) => {
      if (err || document === null) {
        res.status(404).send({
          error: err,
          message: 'Could not update document by the id entered',
          status: '404: Resource Not Found',
        });
      }
       // Only update if a change has happened
      if (req.body.title) document.title = req.body.title;
      if (req.body.content) document.content = req.body.content;
      if (req.body.privacy) document.privacy = req.body.privacy;
      if (req.body.sharewith) document.sharewith = req.body.sharewith;
      if (req.body.access) document.access = req.body.access;

      // Then save the user details
      document.save(() => {
        if (err) {
          res.status(401).send({
            error: err,
            message: 'Error saving document',
            status: '401: Unauthorised',
          });
        } else {
          res.status(200).send({
            success: true,
            message: 'Document details updated successfully',
          });
        }
      });
    });
  },

// [Restricted] To logged in user
  deleteDocumentById: (req, res) => {
    Document.findById({ _id: req.params.document_id })
    .exec((err, document) => {
      if (err) {
        res.status(500).send({
          error: err,
          message: 'Error deleting document',
          status: '500: Server Error',
        });
      } else if (!document) {
        res.status(404).send({
          message: 'No such document found',
          status: '404: Resource Not Found',
        });
      } else if (req.decoded.id != document._creatorId) {
        res.status(401).send({
          message: 'Unauthorised to delete document',
          status: '401: Unauthorised',
        });
      } else {
        Document.remove({ _id: req.params.document_id })
        .exec(() => {
          if (err) {
            res.send(err);
          } else {
            res.status(200).send({
              message: 'Document deleted successfully',
            });
          }
        });
      }
    });
  },

  // Find all documents that belong to a particular user of a certain user id
  // [Restricted] A user sees their own documents or public documents
  getByCreatorId: (req, res) => {
    Document.find(
      {
        $or: [
          { $and: [{ _creatorId: req.params.creator_id }, { privacy: 'public' }] },
          { $and: [{ _creatorId: req.decoded.id }, { _creatorId: req.params.creator_id }] },
        ],
      }
    )
      .exec((err, documents) => {
        if (err) {
          res.status(500).send({
            error: err,
            message: 'Cannot fetch documents',
            status: '500: Server Error',
          });
        } else if (documents.length === 0) {
          res.status(404).send({
            message: 'No documents were found for that user. The document you are referring to may be private',
            status: '404: Resource Not Found',
          });
        } else {
          res.status(200).send(documents);
        }
      });
  },

  // GET all public documents
  getPublicDocuments: (req, res) => {
    Document.find({ privacy: 'public' })
      .exec((err, documents) => {
        if (err) {
          res.status(500).send({
            error: err,
            message: 'Cannot fetch documents',
            status: '500: Server Error',
          });
        } else if (documents.length === 0) {
          res.status(404).send({
            message: 'No public documents found',
            status: '404: Resource Not Found',
          });
        } else {
          res.status(200).send(documents);
        }
      });
  },
// [Restricted] A user can only get documents that have been shared with them
  getBySharedWith: (req, res) => {
    Document.find({ sharewith: req.decoded.id })
    .exec((err, documents) => {
      if (err) {
        res.send(err);
      } else if (documents.length === 0) {
        res.status(404).send({
          message: 'No documents have been shared with you',
          status: '404: Resource Not Found',
        });
      } else {
        res.status(200).send(documents);
      }
    });
  },
};
