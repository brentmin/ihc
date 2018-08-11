import mongoose from 'mongoose';

const Schema = mongoose.Schema;
const MedicationSchema = Schema({
  drugName: String,
  quantity: Number,
  dosage: Number,
  units: String,
  comments: String
});

const MedicationModel = mongoose.model('Medication', MedicationSchema);
module.exports = MedicationModel;
