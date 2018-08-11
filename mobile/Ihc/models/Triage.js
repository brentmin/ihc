/* eslint-disable no-undef */
var t = require('tcomb-form-native');

export default class Triage {

  /**
   * Return the form type, given the value of certain buttons
   */
  static getFormType(form, gender) {
    if(gender === 1 && form.urineTestDone) { // male
      return MaleTriageUrine;
    }
    if(gender === 1 && !form.urineTestDone) { // male
      return MaleTriage;
    }

    if(gender === 2 && form.urineTestDone) { // Female
      return FemaleTriageUrine;
    }
    if(gender === 2 && !form.urineTestDone) { // Female
      return FemaleTriage;
    }

    throw new Error('No form type for these settings...');
  }

  static extractFromForm(form, patientKey, labTestObjects) {
    const triage = Object.assign({}, form);
    triage.patientKey = patientKey;
    triage.lastUpdated = new Date().getTime();

    // Go through test objects, and add the result to the triage object
    for(let obj of Object.values(labTestObjects)) {
      triage[obj.name] = obj.options[obj.result];
    }
    return triage;
  }

  // Can pass in parameters to override defaults, mostly useful for tests
  static getInstance(patientKey = 'firstname&father&mother&20000101',
    date = '20180101', weight = 75, height = 100,
    lastUpdated = new Date().getTime()) {
    return {
      patientKey: patientKey,
      date: date,
      weight: weight,
      height: height,
      lastUpdated: lastUpdated,
      hasInsurance: true,
      location: 'TJP',
      timeIn: '12:00',
      timeOut: '3:00 pm',
      triager: 'person',
      status: 'other',
      statusClarification: 'doc',
      temp: 98,
      rr: 10,
      o2: 10,
      bp: 'string',
      hr: 10,
      history: 'string',
      allergies: 'string',
      medications: 'string',
      surgeries: 'string',
      immunizations: 'string',
      chiefComplaint: 'string',
      pharmacySection: 'string',
      //---IF FEMALE---
      LMP: 'string?',
      regular: 'bool?',
      pregnancies: 'string?',
      liveBirths: 'string?',
      abortions: 'string?',
      miscarriages: 'string?',
      //---END IF---
      labsDone: 'bool',
      //---IF URINE TEST---
      urineTestDone: 'bool',
      leukocytes: 'string?',
      blood: 'string?',
      nitrites: 'string?',
      specificGravity: 'string?',
      urobilirubin: 'string?',
      ketone: 'string?',
      protein: 'string?',
      bilirubin: 'string?',
      ph: 'string?',
      glucose: 'string?',
    };
  }
}

Triage.schema = {
  name: 'Triage',
  properties: {
    patientKey: 'string',
    date: 'string',
    hasInsurance: 'bool',
    location: 'string', // Girasoles or TJP or somewhere else
    arrivalTime: 'int?', // should match checkin time from Status
    //make optional so don't have to deal with it for now
    timeIn: 'string',
    timeOut: 'string',
    triager: 'string', // Name of triager
    status: 'string', // EMT, Student, Nurse, Other
    statusClarification: 'string?', // If Other status, explain
    weight: 'double',
    height: 'double',
    temp: 'double',
    rr: 'double',
    o2: 'double',
    bp: 'string',
    hr: 'double',
    history: 'string',
    allergies: 'string',
    medications: 'string',
    surgeries: 'string',
    immunizations: 'string',
    chiefComplaint: 'string',
    pharmacySection: 'string',
    //---IF FEMALE---
    LMP: 'string?',
    regular: 'bool?',
    pregnancies: 'string?',
    liveBirths: 'string?',
    abortions: 'string?',
    miscarriages: 'string?',
    //---END IF---
    labsDone: 'bool',
    //---IF URINE TEST---
    urineTestDone: 'bool',
    leukocytes: 'string?',
    blood: 'string?',
    nitrites: 'string?',
    specificGravity: 'string?',
    urobilirubin: 'string?',
    ketone: 'string?',
    protein: 'string?',
    bilirubin: 'string?',
    ph: 'string?',
    glucose: 'string?',
    //---END IF---
    lastUpdated: 'int',
  }
};

TriagerStatus = t.enums({
  EMT: 'EMT',
  Student: 'Student',
  Nurse: 'Nurse',
  Other: 'Other'
});

Locations = t.enums({
  TJP: 'TJP',
  Girasoles: 'Girasoles',
});

// Insert any class methods here
MaleTriage = t.struct({
  date: t.String,
  hasInsurance: t.Boolean,
  location: Locations,
  arrivalTime: t.maybe(t.Number), // should match checkin time from Status 
  timeIn: t.String,
  timeOut: t.String,
  triager: t.String, // Name of triager
  status: TriagerStatus,
  statusClarification: t.maybe(t.String), // If Other status, explain
  weight: t.Number,
  height: t.Number,
  temp: t.Number,
  rr: t.Number,
  o2: t.Number,
  bp: t.String,
  hr: t.Number,
  history: t.String,
  allergies: t.String,
  medications: t.String,
  surgeries: t.String,
  immunizations: t.String,
  chiefComplaint: t.String,
  pharmacySection: t.String,
});

FemaleTriage = MaleTriage.extend({
  LMP: t.maybe(t.String),
  regular: t.maybe(t.Boolean),
  pregnancies: t.maybe(t.String),
  liveBirths: t.maybe(t.String),
  abortions: t.maybe(t.String),
  miscarriages: t.maybe(t.String),
});

// Render the urineTest button after other stuff
MaleTriage = MaleTriage.extend({urineTestDone: t.Boolean});
FemaleTriage = FemaleTriage.extend({urineTestDone: t.Boolean});

urineTestObject = {
  leukocytes: t.maybe(t.String),
  blood: t.maybe(t.String),
  nitrites: t.maybe(t.String),
  specificGravity: t.maybe(t.String),
  urobilirubin: t.maybe(t.String),
  ketone: t.maybe(t.String),
  protein: t.maybe(t.String),
  bilirubin: t.maybe(t.String),
  ph: t.maybe(t.String),
  glucose: t.maybe(t.String),
  labsDone: t.Boolean,
};

MaleTriageUrine = MaleTriage.extend(urineTestObject);
FemaleTriageUrine = FemaleTriage.extend(urineTestObject);

// Render the labsDone button after any urine tests
MaleTriage = MaleTriage.extend({labsDone: t.Boolean});
FemaleTriage = FemaleTriage.extend({labsDone: t.Boolean});

/* eslint-enable no-undef */
