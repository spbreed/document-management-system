const app = require('../../index');
const request = require('supertest')(app);
const Document = require('../../server/models/document');

describe('Document tests', () => {
  // Before all tests, log in Victor Hugo
  let token;

  beforeAll((done) => {
    request
      .post('/api/users/login')
      .send({
        username: 'vichugo',
        password: 'victorhugo',
      })
      .end((err, res) => {
        token = res.body.token;
        done();
      });
  });

  it('Should validate that a new document created has a published date defined', (done) => {
    const datePublished = Document.schema.path('createdAt');
    expect(datePublished).toBeDefined();
    done();
  });

  it('Should validate that a user can create documents', (done) => {
    request
      .post('/api/documents')
      .set('x-access-token', token)
      .send({
        title: 'An idea',
        content: 'Whose time has come',
        privacy: 'private',
      })
      .end((err, res) => {
        expect(res.status).toBe(201);
        expect(res.body.message).toBe('Document created successfully');
        expect(res.body.document._id).toBeDefined();
        expect(res.body.document.title).toBeDefined();
        done();
      });
  });

  it('Should validate that all public and the users\' own documents are returned', (done) => {
    request
      .get('/api/documents')
      .set('x-access-token', token)
      .end((err, res) => {
        expect(res.status).toBe(200);
        expect(res.body).toBeDefined();
        expect(Array.isArray(res.body)).toBe(true);
        done();
      });
  });

  it('Should get a document by its id provided it belongs to the logged in user ', (done) => {
    request
      .get('/api/documents/57c975eb2c3d08864b51cd08')
      .set('x-access-token', token)
      .end((err, res) => {
        expect(res.status).toBe(200);
        expect(res.body[0]._id).toBe('57c975eb2c3d08864b51cd08');
        done();
      });
  });

  it('Should validate that a user can update the content of their own documents', (done) => {
    request
      .put('/api/documents/57c975eb2c3d08864b51cd08')
      .set('x-access-token', token)
      .send({
        content: 'It was the best of times, it was the worst of times. ' +
         'It was the age of wisdom, it was the age of...',
      })
      .end((err, res) => {
        expect(res.status).toBe(200);
        expect(res.body.document._id).toBeDefined();
        expect(res.body.document.content).toBe('It was the best of times, it was the '
         + 'worst of times. It was the age of wisdom, it was the age of...');
        expect(res.body.message).toBe('Document details updated successfully');
        done();
      });
  });

  it('Should validate that a user can update the privacy of their own documents', (done) => {
    request
      .put('/api/documents/58c175eb2c3d08874b51cd08')
      .set('x-access-token', token)
      .send({
        privacy: 'public',
      })
      .end((err, res) => {
        expect(res.status).toBe(200);
        expect(res.body).toBeDefined();
        expect(res.body.document.privacy).toBe('public');
        expect(res.body.message).toBe('Document details updated successfully');
        done();
      });
  });

  it('Should validate that only a user can update their own documents', (done) => {
    request
      .put('/api/documents/57d0086ebc185f810bcd0d88')
      .set('x-access-token', token)
      .send({
        content: 'It was the best of times, it was the worst of times.',
      })
      .end((err, res) => {
        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Could not update document by the id entered');
        expect(res.body.document).toBe(null);
        done();
      });
  });

  it('Should return all documents created by a user using their user id', (done) => {
    request
      .get('/api/users/57c94278517ca48c9e5af00f/documents')
      .set('x-access-token', token)
      .end((err, res) => {
        expect(res.status).toBe(200);
        expect(res.body).toBeDefined();
        expect(res.body.length).toBeGreaterThan(0);
        done();
      });
  });

  it('Should return all documents, limited by a specified number, '
  + 'using a query parameter limit', (done) => {
    request
      .get('/api/documents?limit=2')
      .set('x-access-token', token)
      .end((err, res) => {
        expect(res.status).toBe(200);
        expect(res.body).toBeDefined();
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toEqual(2);
        done();
      });
  });

  it('Should return all documents in order of their publishing date', (done) => {
    request
      .get('/api/documents')
      .set('x-access-token', token)
      .end((err, res) => {
        expect(res.status).toBe(200);
        if (res.body.length > 1) {
          expect(res.body[0].createdAt).toBeGreaterThan(res.body[1].createdAt);
        }
        done();
      });
  });

  it('Should have the ability to return paginated documents', (done) => {
    request
      .get('/api/documents?offset=1&limit=1')
      .set('x-access-token', token)
      .end((err, res) => {
        expect(res.status).toBe(200);
        expect(res.body.status).not.toBe('400: Bad request');
        expect(res.body.length).toBe(1);
        done();
      });
  });

  it('Should return an error when a query has a greater offset than'
    + ' limit or documents', (done) => {
    request
      .get('/api/documents?offset=10&limit=1')
      .set('x-access-token', token)
      .end((err, res) => {
        expect(res.status).toBe(404);
        expect((res.body.documents).length).toBe(0);
        done();
      });
  });

  it('Should validate that a document can be deleted by its id', (done) => {
    request
      .delete('/api/documents/57c975eb2c3d08864b51cd08')
      .set('x-access-token', token)
      .end((err, res) => {
        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Document deleted successfully');
        done();
      });
  });

  it('Should return an error message if a user attempts to delete a '
  + 'non existent document', (done) => {
    request
      .delete('/api/documents/57d975eb2c3d08864b51cd09')
      .set('x-access-token', token)
      .end((err, res) => {
        expect(res.status).toBe(404);
        expect(res.body.message).toBe('No such document found');
        done();
      });
  });

  it('Should return an error message if a user attempts to delete'
  + ' a document that does not belong to them', (done) => {
    request
      .delete('/api/documents/57c975eb2c3d08864b51cd0a')
      .set('x-access-token', token)
      .end((err, res) => {
        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Unauthorised to delete document');
        done();
      });
  });

  it('Should be able to get all public documents', (done) => {
    request
      .get('/api/documents/access/public')
      .set('x-access-token', token)
      .end((err, res) => {
        expect(res.status).toBe(200);
        expect(res.body.length).not.toBe(0);
        done();
      });
  });

  it('Should return documents that have been shared with the user', (done) => {
    request
      .get('/api/share')
      .set('x-access-token', token)
      .end((err, res) => {
        expect(res.status).toBe(200);
        expect(res.body[0]).toBeDefined();
        expect(res.body[0]._id.length).toBe(24);
        done();
      });
  });
});
