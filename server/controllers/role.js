const Role = require('../models/role');

module.exports = {

  // Create a role
  create: (req, res) => {
    const role = new Role();

    role.title = req.body.title;
    role.permission = req.body.permission;

    role.save((err) => {
      if (err) {
        if (err.code === 11000) {
          res.status(409).send({
            error: err,
            message: 'Please provide a unique title',
            status: '409: Conflict with Existing Resource',
          });
        } else {
          res.status(500).send({
            error: err,
            message: 'Failed to save document',
            status: '500: Server Error',
          });
        }
      } else {
        res.status(201).send({
          message: 'Role created successfully',
          status: '201: Resource Created',
          role: role,
        });
      }
    });
  },

// Get all roles
  getAll: (req, res) => {
    Role.find()
    .exec((err, roles) => {
      if (err) {
        res.status(500).send({
          error: err,
          message: 'Error ocurred while fetching roles',
          status: '500: Server Error',
        });
      } else if (!roles) {
        res.status(404).send({
          message: 'No roles found',
          status: '404: Resource Not Found',
        });
      } else {
        res.status(200).send(roles);
      }
    });
  },

// [Restricted] Only supra-admin role can update roles
  updateRoleById: (req, res) => {
    if (req.decoded.title === 'supra-admin') {
      Role.findById(req.params.role_id, (err, role) => {
        if (err) {
          res.send(err);
        }
        // Only update if a change has happened
        if (req.body.title) role.title = req.body.title;
        if (req.body.permission) role.permission = req.body.permission;

        // Then save the role
        role.save(() => {
          if (err) {
            res.status(500).send({
              error: err,
              message: 'Error updating role',
              status: '500: Server Error',
            });
          } else {
            res.status(200).send({
              message: 'Role details updated successfully',
              role: role,
            });
          }
        });
      });
    } else {
      res.status(401).send({
        message: 'Unauthorised to update roles',
        status: '401: Unauthorised',
      });
    }
  },

// [Restricted] Only supra-admin role can delete roles
  deleteRoleById: (req, res) => {
    if (req.decoded.title === 'supra-admin') {
      Role.remove({ _id: req.params.role_id },
      (err) => {
        if (err) {
          res.status(500).send({
            error: err,
            message: 'Error deleting role',
            status: '500: Server Error',
          });
        } else {
          res.status(200).send({
            message: 'Role deleted successfully',
          });
        }
      });
    } else {
      res.status(401).send({
        message: 'Not authorised to delete role',
        status: '401: Unauthorised',
      });
    }
  },

  getRoleById: (req, res) => {
    Role.findById(req.params.role_id, (err, role) => {
      if (err) {
        res.status(500).send({
          error: err,
          message: 'Error fetching role',
          status: '500: Server Error',
        });
      } else if (!role) {
        res.status(404).send({
          message: 'No role by that id found',
          status: '404: Resource Not Found',
        });
      } else {
        res.status(200).send(role);
      }
    });
  },
};
