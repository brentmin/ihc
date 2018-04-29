import PatientModel from '../models/Patient';
import SoapModel from '../models/Soap';
import StatusModel from '../models/Status';
import TriageModel from '../models/Triage';
import DrugUpdateModel from '../models/DrugUpdate';

const PatientController = {
  GetPatient: function(req, res){
    PatientModel.findOne({key: req.params.key}, function(err, patient) {
      if(!patient) {
        err = new Error("Patient with key " + req.params.key + " doesn't exist");
      }
      if(err) {
        res.json({status: false, error: err.message});
        return;
      }
      res.json({status: true, patient: patient});
    });
  },
  GetPatients: function(req, res){
  },
  CreatePatient: function(req, res){
    // Check that no patient with that key exists
    PatientModel.findOne({key: req.body.patient.key}, function(err, patient) {
      if (patient) {
        // Hopefully shouldn't happen, but would be rare enough to not worry
        // about
        err = new Error("Patient already exists with that name and birthday. Use a different name");
      }
      if(err) {
        res.json({status: false, error: err.message});
        return;
      }
    });

    const patient = PatientModel.create(req.body.patient, function (err) {
      if(err) {
        res.json({status: false, error: err.message});
        return;
      }
      res.json({status: true});
    })
  },
  UpdatePatient: function(req, res){
    PatientModel.findOne({key: req.params.key}, function(err, oldPatient) {
      if(!oldPatient) {
        err = new Error("Patient with key " + req.params.key + " doesn't exist");
      }
      // For updates, make sure the incoming object is up to date
      if(oldPatient.lastUpdated > req.body.patient.lastUpdated) {
        err = new Error("Patient sent is not up-to-date. Sync required.");
      }
      if(err) {
        res.json({status: false, error: err.message});
        return;
      }

      oldPatient.set(req.body.patient);
      oldPatient.save(function(e, p) {
        if(e) {
          res.json({status: false, error: e.message});
          return;
        }
        res.json({status: true});
        return;
      });
    })
  },
  GetUpdates: function(req, res){
  },
  GetSoap: function(req, res){
  },
  GetStatus: function(req, res){
  },
  GetTriage: function(req, res){
  },
  GetDrugUpdates: function(req, res){
  },
  UpdateSoap: function(req, res){
    PatientModel.findOne({key: req.params.key}, function(err, patient) {
      if(!patient) {
        err = new Error("Patient with key " + req.params.key + " doesn't exist");
      }

      for(let [i,soap] of patient.soaps.entries()) {
        // If an existing soap for that date exists, then update it
        if(soap.date == req.body.soap.date) {
          if(soap.lastUpdated > req.body.soap.lastUpdated) {
            res.json({
              status: false,
              error: "Soap sent is not up-to-date. Sync required."
            });
            return;
          }

          patient.soaps[i] = req.body.soap;
          patient.save(function(err) {
            if(err) {
              res.json({status: false, error: err.message});
              return;
            }
            res.json({status: true});
            return;
          });
          return;
        }
      }

      // No soap exists yet, so add a new one
      patient.soaps.push(req.body.soap);
      patient.save(function(err) {
        if(err) {
          res.json({status: false, error: err.message});
          return;
        }
        res.json({status: true});
        return;
      });
    });
  },
  UpdateStatus: function(req, res){
  },
  UpdateTriage: function(req, res){
  },
  UpdateDrugUpdates: function(req, res){
  }
};

module.exports = PatientController;
