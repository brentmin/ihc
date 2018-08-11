import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View
} from 'react-native';
var t = require('tcomb-form-native');
var Form = t.form.Form;
import {localData, serverData} from '../services/DataService';
import Triage from '../models/Triage';
import {stringDate} from '../util/Date';
import Container from '../components/Container';
import Button from '../components/Button';
import TriageLabsWheel from '../components/TriageLabsWheel';

class TriageScreen extends Component<{}> {
  /**
   * Redux props:
   * patientKey
   * loading
   * todayDate (optional, if doesn't exist, then assume date is for today,
   *   can be used for gathering old traige data from history)
   */
  constructor(props) {
    super(props);
    this.startingFormValues = {
      labsDone: false,
      urineTestDone: false,
      date: this.props.todayDate || stringDate(new Date())
    };

    // Hold objects including a test's name, options, and result (int that
    // indexes into the options array)
    // TODO: replace with real tests and options once we get the template
    // and also update the Triage models on mobile and server side
    const labTestObjects = {
      blood: TriageLabsWheel.createLabTestObject('blood', ['N/a', 'Good', 'Bad']),
      nitrites: TriageLabsWheel.createLabTestObject('nitrites', ['N/a', 'Good', 'Bad']),
    };

    this.state = {
      formValues: this.startingFormValues,
      formType: Triage.getFormType(this.startingFormValues, 2),
      gender: 2, // 1: male, 2: female
      todayDate: this.startingFormValues.date,
      labTestObjects: labTestObjects
    };

    this.props.clearMessages();
  }

  // TODO: any other styling? multiline fields needed?
  options = {
    fields: {
      statusClarification: {label: 'Status clarification (if picked Other)'},
      labsDone: {label: 'Did they get labs done?'},
      date: {
        editable: false,
      }
    },
  }

  // to set the triage form correctly depending on gender
  loadPatient = () => {
    this.props.setLoading(true);

    try {
      const patient = localData.getPatient(this.props.patientKey);
      this.setState({
        gender: patient.gender,
      });
      this.props.setLoading(false);

      // Call loadFormValues here, or else gender state isn't propogated like
      // expected
      this.loadFormValues(patient.gender);
    } catch(err) {
      this.props.setErrorMessage(err.message);
      this.props.setLoading(false);
    }
  }

  // Load existing Triage info if it exists
  loadFormValues = (gender) => {
    this.props.setLoading(true);
    const triage = localData.getTriage(this.props.patientKey, this.state.todayDate);
    if (!triage) {
      this.props.setLoading(false);
      this.setState({
        formType: Triage.getFormType(this.startingFormValues, gender)
      });
      return;
    }

    this.props.setLoading(false);
    this.setState({
      formType: Triage.getFormType(triage, gender),
      formValues: triage,
      labTestObjects: this.getLabTestObjects(triage)
    });
  }

  // From an existing triage form, properly update the lab test objects with the
  // existing values
  getLabTestObjects = (triage) => {
    const labTestObjectsCopy = Object.assign({}, this.state.labTestObjects);
    // For each test, set the result field of the labTestObject to the proper
    // index of the options array
    for(const [testName,test] of Object.entries(labTestObjectsCopy)) {
      if(!triage[testName]){
        // If there is no value yet for that test, then skip it
        continue;
      }
      test.result = test.options.indexOf(triage[testName]);
      if(test.result === -1) {
        throw new Error(`${test} does not contain string option ${triage[testName]}`);
      }
    }
    return labTestObjectsCopy;
  }

  componentDidMount() {
    this.loadPatient();
  }

  onFormChange = (value) => {
    this.setState({
      formType: Triage.getFormType(value, this.state.gender),
      formValues: value,
    });
  }

  // Updates the timestamp that displays in the PatientSelectScreen
  // Doesn't actually save the Triage form
  completed = () => {
    this.props.setLoading(true);
    let statusObj = {};
    try {
      statusObj = localData.updateStatus(this.props.patientKey, this.state.todayDate,
        'triageCompleted', new Date().getTime());
    } catch(e) {
      this.props.setLoading(false);
      this.props.setErrorMessage(e.message);
      return;
    }

    this.props.isUploading(true);
    serverData.updateStatus(statusObj)
      .then( () => {
        // View README: Handle syncing the tablet, point 3 for explanation
        if(this.props.loading) {
          this.props.setLoading(false);
          this.props.setSuccessMessage('Triage marked as completed, but not yet submitted');
        }
      })
      .catch( (e) => {
        if(this.props.loading) {
          localData.markPatientNeedToUpload(this.props.patientKey);
          this.props.setErrorMessage(e.message);
          this.props.setLoading(false, true);
        }
      });
  }

  // Saves the Triage, first locally, then over the server
  submit = () => {
    if(!this.refs.form.validate().isValid()) {
      this.props.setErrorMessage('Form not correct. Review form.');
      return;
    }

    this.props.clearMessages();
    this.props.setLoading(true);

    const form = this.refs.form.getValue();
    const triage = Triage.extractFromForm(form, this.props.patientKey, this.state.labTestObjects);

    try {
      localData.updateTriage(triage);
    } catch(e) {
      this.props.setErrorMessage(e.message);
      this.props.setLoading(false);
      return;
    }

    this.props.setSuccessMessage('Triage updated successfully');
    this.props.setLoading(false);
  }

  gotoMedications = () => {
    this.props.navigator.push({
      screen: 'Ihc.MedicationScreen',
      title: 'Back to triage',
      passProps: { name: this.props.name, patientKey: this.props.patientKey }
    });
  }

  // Takes in the test name and the string result
  updateLabTests = (name,result) => {
    const oldTests = Object.assign({}, this.state.labTestObjects);
    oldTests[name].result = result;
    this.setState(oldTests);
  }

  render() {
    return (
      <Container>

        <Text style={styles.title}>
          Triage
        </Text>

        <View style={styles.form}>
          <Form ref='form'
            type={this.state.formType}
            value={this.state.formValues}
            options={this.options}
            onChange={this.onFormChange}
          />

          {
            this.state.formValues.labsDone ?
              (
                <TriageLabsWheel
                  updateLabResult={this.updateLabTests}
                  tests = {Object.values(this.state.labTestObjects)}
                />
              ) : null
          }

          <Button onPress={this.gotoMedications}
            text='Mark Medications' />

          <Button onPress={this.completed}
            text='Triage completed' />

          <Button onPress={this.submit}
            text='Update' />

        </View>
      </Container>
    );
  }
}

const styles = StyleSheet.create({
  form: {
    width: '80%',
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
});

// Redux
import { setLoading, setErrorMessage, setSuccessMessage, clearMessages, isUploading } from '../reduxActions/containerActions';
import { connect } from 'react-redux';

const mapStateToProps = state => ({
  loading: state.loading,
  patientKey: state.currentPatientKey
});

const mapDispatchToProps = dispatch => ({
  setLoading: (val,showRetryButton) => dispatch(setLoading(val, showRetryButton)),
  setErrorMessage: val => dispatch(setErrorMessage(val)),
  setSuccessMessage: val => dispatch(setSuccessMessage(val)),
  clearMessages: () => dispatch(clearMessages()),
  isUploading: val => dispatch(isUploading(val)),
});

export default connect(mapStateToProps, mapDispatchToProps)(TriageScreen);
