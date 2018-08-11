//treat these imports as 'containers'
//to access/modify these containers, look up mongodb functions
import PatientModel from '../models/Patient';
import MedicationModel from '../models/Medication';

//function params for all calls are generally the same function(req,res)
const PatientController = {
  //GET API CALL
  //treat 'req' as info being passed in from the front end and 'res' as a tool to send things back to the front end
  GetPatient: function(req, res){
    //this function finds ONE document in the patientModel container
    //first parameter is an object with the attribute(s) that the function is trying to match to a document with in the container
    //second parameter is a callback function once the function finds the document, or an error occurs
    //params for this function is err (in case an error occur) and patient (the returned object)
    PatientModel.findOne({key: req.params.key}, function(err, patient) {
      if(!patient) {
        err = new Error('Patient with key ' + req.params.key + ' doesn\'t exist');
      }
      if(err) {
        res.json({status: false, error: err.message});
        return;
      }
      //res.json sends back info to the front end
      //we're sending back an object with a status and patient attribute
      //status for if an error occured or not, and patient for the patients info
      res.json({status: true, patient: patient});
    });
  },
  GetPatients: function(req, res){
    const timestamp = parseInt(req.params.lastUpdated);
    // couldn't convert properly
    if(isNaN(timestamp)) {
      res.json({status:false, error: 'Error converting lastUpdated to int'});
      return;
    }

    PatientModel.find({ lastUpdated: {$gt: timestamp} },function(err, patientList){
      if(err){
        res.json({status:false, error: err.message});
        return;
      }
      res.json({status: true, patients: patientList});
    });
  },
  UpdatePatients: function(req, res){
    const patients = req.body.patients;
    const errors = [];
    let addedCount = 0;
    let updatedCount = 0;

    patients.forEach(patient => {
      PatientModel.findOne({key: patient.key}, function(err, oldPatient) {
        if(err) {
          errors.push(err.message);
          return;
        }

        // If no patient exists on the server, add them
        if(!oldPatient) {
          PatientModel.create(patient, function(err) {
            if(err)
              errors.push(err);
            else
              addedCount++;
          });
          return;
        }

        // For updates, make sure the incoming object is up to date
        if(oldPatient.lastUpdated > patient.lastUpdated) {
          errors.push('Patient sent is not up-to-date. Sync required.');
        }

        // TODO: Iterate through forms and update individually if lastUpdated
        // works out, instead of a blanket set() call
        oldPatient.set(patient);
        //saves it, callback function to handle error
        oldPatient.save(function(e) {
          if(e) {
            errors.push(e);
          } else {
            updatedCount++;
          }
        });
      });
    });
    res.json({errors: errors, addedCount: addedCount, updatedCount: updatedCount});
  },
  CreatePatient: function(req, res){
    // Check that no patient with that key exists
    PatientModel.findOne({key: req.body.patient.key}, function(err, patient) {
      if (patient) {
        // Hopefully shouldn't happen, but would be rare enough to not worry
        // about
        err = new Error('Patient already exists with that name and birthday. Use a different name');
      }
      if(err) {
        res.json({status: false, error: err.message});
        return;
      }

      PatientModel.create(req.body.patient, function (err) {
        if(err) {
          res.json({status: false, error: err.message});
          return;
        }
        res.json({status: true});
        return;
      });
    });
  },
  UpdatePatient: function(req, res){
    PatientModel.findOne({key: req.params.key}, function(err, oldPatient) {
      if(!oldPatient) {
        err = new Error('Patient with key ' + req.params.key + ' doesn\'t exist');
      }
      // For updates, make sure the incoming object is up to date
      if(oldPatient.lastUpdated > req.body.patient.lastUpdated) {
        err = new Error('Patient sent is not up-to-date. Sync required.');
      }
      if(err) {
        res.json({status: false, error: err.message});
        return;
      }


      // Only update the given properties
      const properties = ['birthday', 'gender', 'phone', 'motherHeight', 'fatherHeight', 'lastUpdated'];
      properties.forEach( p => {
        if(req.body.patient[p] !== undefined)
          oldPatient[p] = req.body.patient[p];
      });

      //saves it, callback function to handle error
      oldPatient.save(function(e) {
        if(e) {
          res.json({status: false, error: e.message});
          return;
        }
        res.json({status: true});
        return;
      });
    });
  },
  GetSoap: function(req, res){
    PatientModel.findOne({key: req.params.key}, function(err, patient) {
      if(!patient) {
        err = new Error('Patient with key ' + req.params.key + ' doesn\'t exist');
      }

      if (err) {
        res.json({status: false, error: err.message});
        return;
      }

      for(let soap of patient.soaps) {
        // If an existing soap for that date exists, then update it
        if(soap.date === req.params.date) {
          res.json({status: true, soap: soap});
          return;
        }
      }

      err = new Error('Patient with key ' + req.params.key + ' does not have a soap for the date ' + req.params.date);
      res.json({status: false, error: err.message});
      return;
    });
  },
  GetStatus: function(req, res){
    PatientModel.findOne({key: req.params.key}, function(err, patient) {
      if (!patient) {
        err = new Error('Patient with key ' + req.params.key + ' does not exist');
      }

      if (err) {
        res.json({status: false, error: err.message});
        return;
      }

      for(const statusObj of patient.statuses) {
        if(statusObj.date === req.params.date) {
          // Return objects as patientStatuses because status is taken to refer to
          // the success
          res.json({status: true, patientStatus: statusObj});
          return;
        }
      }

      res.json({
        status: false,
        error: `Status for patientKey ${req.params.key} and date ${req.params.date} does not exist`
      });
    });
  },
  GetStatuses: function(req, res){
    // Because Mongo doesn't seem to support querying on embedded documents,
    // first find all the Patients with a Status from the passed in date.
    // Then iterate through all those patients' status objects, saving the
    // statuses that match the date.
    // If there is a better way to do this, then please update this nastiness
    // :'(
    PatientModel.find({ 'statuses.date': req.params.date }, { statuses: 1, _id: 0 },
      (err, patients) => {
        if (err) {
          res.json({status: false, error: err.message});
          return;
        }

        const statuses = [];
        for(const patient of patients) {
          for(const statusObj of patient.statuses) {
            if(statusObj.date === req.params.date) {
              statuses.push(statusObj);
            }
          }
        }

        // Return objects as patientStatuses because status is taken to refer to
        // the success
        res.json({status: true, patientStatuses: statuses});
      });
  },
  GetTriage: function(req, res){
    PatientModel.findOne({key: req.params.key}, function(err, patient) {
      if(!patient) {
        err = new Error('Patient with key ' + req.params.key + ' doesn\'t exist');
      }

      if (err) {
        res.json({status: false, error: err.message});
        return;
      }

      for(let triage of patient.triages) {
        // If an existing soap for that date exists, then update it
        if(triage.date === req.params.date) {
          res.json({status: true, triage: triage});
          return;
        }
      }

      err = new Error('Patient with key ' + req.params.key + ' does not have a triage for the date ' + req.params.date);
      res.json({status: false, error: err.message});
      return;
    });
  },
  GetDrugUpdates: function(req, res){
    PatientModel.findOne({key: req.params.key}, function(err, patient) {
      if(!patient) {
        err = new Error('Patient with key ' + req.params.key + ' doesn\'t exist');
      }

      if(err) {
        res.json({status: false, error: err.message});
        return;
      }

      res.json({status: true, drugUpdates: patient.drugUpdates});
    });
  },
  UpdateSoap: function(req, res){
    PatientModel.findOne({key: req.params.key}, function(err, patient) {
      if(!patient) {
        err = new Error('Patient with key ' + req.params.key + ' doesn\'t exist');
      }

      if(err) {
        res.json({status: false, error: err.message});
        return;
      }

      for(let [i,soap] of patient.soaps.entries()) {
        // If an existing soap for that date exists, then update it
        if(soap.date === req.params.date) {
          if(soap.lastUpdated > req.body.soap.lastUpdated) {
            res.json({
              status: false,
              error: 'Soap sent is not up-to-date. Sync required.'
            });
            return;
          }

          patient.soaps[i] = req.body.soap;
          patient.lastUpdated = req.body.soap.lastUpdated;
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
      patient.lastUpdated = req.body.soap.lastUpdated;
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
    PatientModel.findOne({key: req.params.key}, function(err, patient) {
      if(!patient) {
        err = new Error('Patient with key ' + req.params.key + ' doesn\'t exist');
      }

      if(err) {
        res.json({status: false, error: err.message});
        return;
      }

      for (let [i,status] of patient.statuses.entries()) {
        if (status.date === req.params.date) {
          //status should not be updated
          if (status.lastUpdated > req.body.status.lastUpdated) {
            res.json({
              status: false,
              error: 'Status sent is not up-to-date. Sync required.'
            });
            return;
          }

          patient.statuses[i] = req.body.status;
          patient.lastUpdated = req.body.status.lastUpdated;
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

      //status does not exist yet
      patient.statuses.push(req.body.status);
      patient.lastUpdated = req.body.status.lastUpdated;
      patient.save(function(err) {
        if (err) {
          res.json({status: false, error: err.message});
          return;
        }
        res.json({status: true});
        return;
      });
    });
  },

  UpdateTriage: function(req, res){
    PatientModel.findOne({key: req.params.key}, function(err, patient) {
      if(!patient) {
        err = new Error('Patient with key ' + req.params.key + ' doesn\'t exist');
      }

      if(err) {
        res.json({status: false, error: err.message});
        return;
      }

      for(let [i,triage] of patient.triages.entries()) {
        // If an existing triage for that date exists, then update it
        if(triage.date === req.body.triage.date) {
          if(triage.lastUpdated > req.body.triage.lastUpdated) {
            res.json({
              status: false,
              error: 'Triage sent is not up-to-date. Sync required.'
            });
            return;
          }

          patient.triages[i] = req.body.triage;
          patient.lastUpdated = req.body.triage.lastUpdated;
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

      // No triage exists yet, so add a new one
      patient.triages.push(req.body.triage);
      patient.lastUpdated = req.body.triage.lastUpdated;
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
  UpdateDrugUpdate: function(req, res) {
    PatientModel.findOne({key: req.params.key}, function(err, patient) {
      if(!patient) {
        err = new Error('Patient with key ' + req.params.key + ' doesn\'t exist');
      }

      if(err) {
        res.json({status: false, error: err.message});
        return;
      }

      for (let [i,drugUpdate] of patient.drugUpdates.entries()) {
        if (drugUpdate.date === req.params.date && drugUpdate.name === req.body.drugUpdate.name) {
          if (drugUpdate.lastUpdated > req.body.drugUpdate.lastUpdated) {
            res.json({
              status: false,
              error: 'Medication sent is not up-to-date. Sync required.'
            });
            return;
          }

          patient.drugUpdates[i] = req.body.drugUpdate;
          patient.lastUpdated = req.body.drugUpdate.lastUpdated;

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

      patient.drugUpdates.push(req.body.drugUpdate);
      patient.lastUpdated = req.body.drugUpdate.lastUpdated;

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
  /* body: medication object */
  CreateMedication: function(req, res) {
    MedicationModel.findOne({drugName: req.body.medication.drugName}, function(err, drug) {
      if (drug) {
        err = new Error(`A medication with the name ${req.body.medication.drugName} already exists`);
      }
      if (err) {
        res.json({status: false, error: err.message});
        return;
      }
      MedicationModel.create(req.body.medication, function (err) {
        if(err) {
          res.json({status: false, error: err.message});
          return;
        }
        res.json({status: true});
        return;
      });
    });
  },
  /* body: NA, returns: array of medication objects */
  GetMedications: function(req, res) {
    MedicationModel.find({drugName: req.params.name}, function(err, drugs) {
      if (drugs.length === 0) {
        err = new Error(`A medication with the name ${req.params.name} does not exist`);
      }
      if(err) {
        res.json({status: false, error: err.message});
        return;
      }
      res.json({status: true, medications: drugs});
      return;
    });
  },
  /* body: medication object */
  UpdateMedication: function(req, res) {
    MedicationModel.findOne({drugName: req.params.name}, function(err, drug) {
      if (!drug) {
        err = new Error(`A medication with the name ${req.params.name} does not exist`);
      }
      if (err) {
        res.json({status: false, error: err.message});
        return;
      }

      for (let p in req.body.medication) {
        drug[p] = req.body.medication[p];
      }

      //saves it, callback function to handle error
      drug.save(function(e) {
        if(e) {
          res.json({status: false, error: e.message});
          return;
        }
        res.json({status: true});
        return;
      });
    });
  },
  DeleteMedication: function(req, res) {
    MedicationModel.deleteMany({drugName: req.params.name}, function(err, drug) {
      if(!drug) {
        err = new Error(`A medication with the name ${req.params.name} does not exist`);
      }
      if (err) {
        res.json({status: false, error: err.message});
        return;
      }
      res.json({status: true});
      return;
    });
  }
};

module.exports = PatientController;
