import {stringDate, getYear, getMonth} from '../util/Date';
export default class Patient {
  // Insert any class methods here

  // Calculate age from the given date, ignoring the day of the month
  // for simplicity
  calculateAgeInMonths(now = stringDate(new Date())) {
    const strBirthday = this.birthday;
    const birthdayYear = getYear(strBirthday);
    const birthdayMonth= getMonth(strBirthday);

    const nowYear = getYear(now);
    const nowMonth= getMonth(now);

    let yearsDiff = nowYear - birthdayYear;
    let monthsDiff = nowMonth - birthdayMonth;

    let months = yearsDiff * 12 + monthsDiff;
    return months;
  }

  get age() {
    const strBirthday = this.birthday;
    const today = stringDate(new Date());
    const birthdayYear = parseInt(strBirthday.slice(0,4)); // Get the year
    const birthdayMonthDay= parseInt(strBirthday.slice(4));
    const todayYear = parseInt(today.slice(0,4));
    const todayMonthDay = parseInt(today.slice(4));

    let age = todayYear - birthdayYear;
    // If hasn't passed their birthday this year, then subtract
    if(birthdayMonthDay < todayMonthDay) {
      age--;
    }
    return age;
  }

  /* Returns {
   *   weights: [[ageInMonths, weight (kg)],...]},
   *   heights: [[ageInMonths, height (cm)],...]}
   * }
   */
  get growthChartData() {
    const triages = this.triages;
    const weights = [];
    const heights = [];
    // TODO: use triage date to calculate their age in months
    triages.forEach( triage => {
      const ageInMonths = this.calculateAgeInMonths(triage.date);
      weights.push([ageInMonths, triage.weight]);
      heights.push([ageInMonths, triage.height]);
    });
    return {weights, heights};
  }

  get isMale() {
    return this.gender === 1;
  }

  get isInfant() {
    return this.age < 3;
  }

  static fullName(patient) {
    return `${patient.firstName} ${patient.fatherName} ${patient.motherName}`;
  }

  // To be used as primary key
  static makeKey(patient) {
    const str = `${patient.firstName}&${patient.fatherName}&${patient.motherName}` +
      `&${patient.birthday}`;
    return str;
  }

  // Capitalize first letter, lowercase the rest
  static standardizeName(name) {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }

  static extractFromForm = (form) => {
    const patient = Object.assign({}, form);

    patient.firstName = Patient.standardizeName(form.firstName);
    patient.fatherName = Patient.standardizeName(form.fatherName);
    patient.motherName = Patient.standardizeName(form.motherName);

    patient.birthday = stringDate(form.birthday);
    patient.key = Patient.makeKey(patient);
    patient.needToUpload = false;
    patient.lastUpdated = new Date().getTime();

    if(form.newPatient) {
      // 1 is male, 2 is female
      patient.gender = form.gender === 'Male' ? 1 : 2;
    }
    return patient;
  }

  // Can pass in parameters to override defaults, mostly useful for tests
  static getInstance(lastUpdated = new Date().getTime(),
    key = 'firstname&father&mother&20000101', firstName = 'firstname',
    fatherName = 'father', motherName = 'mother', birthday = '20000101',
    gender = 1, phone = null, motherHeight = 100, fatherHeight = 100,
    drugUpdates = [], soaps = [], triages = [], statuses = []) {
    return {
      key, firstName, fatherName, motherName, birthday, gender, phone, motherHeight,
      fatherHeight, drugUpdates, soaps, triages, statuses, lastUpdated
    };
  }
}

Patient.schema = {
  name: 'Patient',
  primaryKey: 'key',
  properties: {
    key: 'string',
    firstName: 'string',
    fatherName: 'string', // last name
    motherName: 'string', // last name
    birthday: 'string',
    gender: 'int', // 1 = boy, 2 = girl, 0 = undefined
    phone: 'string?',
    motherHeight: 'double?',
    fatherHeight: 'double?',
    drugUpdates: 'DrugUpdate[]',
    soaps: 'Soap[]',
    triages: 'Triage[]',
    statuses: 'Status[]',
    lastUpdated: 'int', // timestamp
    needToUpload: 'bool?'
  }
};
