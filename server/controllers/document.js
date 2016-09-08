const Document = require('../models/document');

module.exports = {
  // Create document with a unique title
  create: (req, res) =>  {
    var document = new Document();

    document.title = req.body.title;
    document.content = req.body.content;
    document.privacy = req.body.privacy;
    document._creatorId = req.decoded.id;
    document.sharewith = req.body.sharewith;
    document.access = req.body.access;

    document.save(function(err) {
      if (err) {
        return res.send(err);
      }
      else {
        res.json({
          success: true,
          message: 'Document created successfully'
        });
      }
    });
  },

  // Get all documents
  // [Restricted] Only able to get your documents and public documents
  getAll: (req, res) => {
    Document.find(
      {
        $or: [ { _creatorId: req.decoded.id }, { privacy: 'public' } ]
      }
    )
    // .where('privacy').equals('public')
    .sort('-createdAt')
    .exec(function(err, documents) {
      if (err) {
        res.send(err);
      }
      else {
        res.json(documents);
      }
    });
  },

// [Restricted] Can only fetch documents of logged in user
  getDocumentById: (req, res) => {
    Document.findById(req.params.document_id)
    .where('_creatorId').equals(req.decoded.id)
    .exec(function(err, documents){
      if (err) {
        res.send(err);
      }
      else if (!documents) {
        res.json({
          success: false,
          message: 'Cannot access document by that id',
          status: -1
        });
      }
      else {
        res.json(documents);
      }
    });
  },

  // [Restricted] Can only edit documents of logged in user
  updateDocumentById: function(req, res) {
    Document.findById(req.params.document_id)
    .where('_creatorId').equals(req.decoded.id)
    .exec(function(err, document) {
      if (err) {
        res.send(err);
      }
       // Only update if a change has happened
      if (req.body.title) document.title = req.body.title;
      if (req.body.content) document.content = req.body.content;
      if (req.body.privacy) document.privacy = req.body.privacy;
      if (req.body.sharewith) document.sharewith = req.body.sharewith;
      if (req.body.access) document.access = req.body.access;

      // Then save the user details
      document.save(function(err) {
        // If there's an error, tell us
        if (err) {
          res.send(err);
        }
        // Everything went well
        else {
          res.json({
            success: true,
            message: 'Document details updated successfully'
          });
        }
      });
    });
  },

// [Restricted] To logged in user
  deleteDocumentById: function(req, res) {
    Document.find()
    .where('_creatorId').equals(req.decoded.id)
    .exec(function(err) {
      if (err) {
        res.send(err);
      }
      else {
        Document.remove(
          {
            $and: [ { _creatorId: req.decoded.id }, { _id: req.params.document_id } ]
          }
      , function(err) {
          if (err) {
            res.send(err);
          }
          else {
            res.json({
              success: true,
              message: 'Deleted successfully if document was yours. Failed to delete another users\' documents'
            });
          }
        });
      }
    });
  },

  // Find all documents that belong to a particular user of a certain user id
  // [Restricted] One must only see their own documents or public documents
  getByCreatorId: function(req, res) {
    Document.find(
      {
        $or: [
          { $and: [ {_creatorId: req.params.creator_id }, {privacy: 'public'} ] },
          { $and: [ {_creatorId: req.decoded.id } ] },
        ]
      }
    )
      .exec(function (err, documents) {
        if (err) {
          res.send(err);
          return;
        }
        // documents is an array of documents
        else if (documents[0] == null) {
          res.json({
            message: 'No documents were found for that user.The document you are refering to may be private'
          });
        } else {
          res.send(documents);
        }
      });

  },

  // GET all documents created on a specific date (query: date, limit)
  //  [Restricted] Cannot get private documents not yours
  // TODO: Enable document fetch using date part of createdAt field
  getByDatePublished: (req, res) => {
    Document.find({
      $or: [
        { $and: [ {createdAt: req.params.date }, {privacy: 'public'} ] },
        { $and: [ {_creatorId: req.decoded.id }, {createdAt: req.params.date } ] },
      ]
    })
    .limit(parseInt(req.params.limit))
    .exec(function(err,documents) {
      if (err) {
        res.send(err);
      }
      else {
        res.send(documents);
      }
    });
  },

  // A route that (query: limit) returns all the documents in order of the dates they were created (ascending or descending).
  // TODO: Merge with documents/date/limit route? If date param is null, fetch all documents regardless of created date
  getDocumentsWithLimit: (req, res) => {
    Document.find(
      {
        $or: [  {_creatorId: req.decoded.id }, {privacy: 'public'} ]
      }
    )
     .limit(parseInt(req.params.limit))
     .sort('-createdAt')
     .exec(function(err,documents) {
       if (err) {
         res.send(err);
       }
       else {
         res.send(documents);
       }
     });
  },

  // GET all public documents
  // Set 'public' in route as param to enable get private docs. Document.find({privacy: req.params.public})
  getPublicDocuments: (req, res) => {
    Document.find({privacy: 'public'})
      .exec(function(err, documents) {
        if (err) {
          res.send(err);
          res.json({
            success: false,
            message: 'Cannot get private documents that are not the logged in users'
          });
        }
        else {
          res.send(documents);
        }
      });
  },

    // [Restricted]: Able to search logged in users documents and public documents
  search: (req, res) => {
    // To create the index on the documents collection, do this in the terminal
    // db.documents.createIndex({"title":"text","content":"text"})
    Document.find(
      {
        $or: [  {_creatorId: req.decoded.id }, {privacy: 'public'} ]
      }
    )
    .exec(function(err) {
      if (err) {
        res.send(err);
      }
      else {
        Document.find({$text:{$search:req.params.search_string}},{score:{$meta:'textScore'}}).sort({score:{$meta:'textScore'}})
        .exec(function(err, documents) {
          if (err) {
            return res.send(err);
          }
          else {
            // No results for the search
            if (documents[0] == null) {
              return res.json({
                success: false,
                message: 'No results found.',
                status: -1
              });
            }
            else {
              return res.json(documents);
            }
          }
        });
      }
    });
  },

  getByRole: (req, res) => {
    // Find all documents that can be accessed by a certain role
    Document.find({access: req.params.role})
    .exec(function(err, documents) {
      if (err) {
        res.send(err);
      }
      else {
        res.json(documents);
      }
    });
  },

// [Restricted]
  getByOffset: (req, res) => {
    Document.find(
      {
        $or: [  {_creatorId: req.decoded.id }, {privacy: 'public'} ]
      }
    )
    .skip(parseInt(req.params.offset))
    .limit(parseInt(req.params.per_page))
    .exec(function(err, documents) {
      if (err) {
        res.send(err);
      } else if (parseInt(req.params.offset) > documents.length) {
        res.json({
          success: false,
          message: 'Offset greater than number of documents or limit param. Cannot fetch',
          status: -1
        });
      }
      else {
        res.json(documents);
      }
    });
  },

  getBySharedWith: (req, res) => {
    Document.find({sharewith: req.params.share})
    .exec(function(err, documents) {
      if (err) {
        res.send(err);
      }
      else {
        res.json(documents);
      }
    });
  }
};
