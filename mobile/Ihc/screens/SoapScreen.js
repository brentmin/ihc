import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View
} from 'react-native';
var t = require('tcomb-form-native');
var Form = t.form.Form;

import {localData, serverData} from '../services/DataService';
import Soap from '../models/Soap';
import {stringDate} from '../util/Date';
import Container from '../components/Container';
import Button from '../components/Button';
import {downstreamSyncWithServer} from '../util/Sync';

class SoapScreen extends Component<{}> {
  /*
   * Redux props:
   * loading: boolean
   * currentPatientKey: string
   *
   * Props:
   * name: patient's name for convenience
   * patientKey: string of patient's key
   * todayDate (optional, if doesn't exist, then assume date is for today,
   *   can be used for gathering old traige data from history)
   */
  constructor(props) {
    super(props);
    const todayDate = this.props.todayDate || stringDate(new Date());
    this.state = {
      formValues: {date: todayDate},
      todayDate: todayDate
    };
  }

  // TODO: Make form fields larger, more like textarea
  Soap = t.struct({
    date: t.String,
    subjective: t.maybe(t.String),
    objective: t.maybe(t.String),
    assessment: t.maybe(t.String),
    plan: t.maybe(t.String),
    wishlist: t.maybe(t.String),
    provider: t.String // Doctor's name
  });

  formOptions = {
    fields: {
      date: {
        editable: false,
      },
      subjective: {
        multiline: true,
      },
      objective: {
        multiline: true,
      },
      assessment: {
        multiline: true,
      },
      plan: {
        multiline: true,
      },
      wishlist: {
        multiline: true,
      },
    }
  }

  syncAndLoadFormValues = () => {
    this.props.setLoading(true);
    this.props.isUploading(false);
    this.props.clearMessages();

    // Load existing SOAP info if it exists
    const soap = localData.getSoap(this.props.currentPatientKey, this.state.todayDate);
    if (soap) {
      this.setState({ formValues: soap });
    }

    // Attempt server download and reload information if successful
    downstreamSyncWithServer()
      .then( ( failedPatientKeys) => {
        if (this.props.loading) {
          if (failedPatientKeys.length > 0) {
            throw new Error(`${failedPatientKeys.length} patients didn't properly sync.`);
          }

          const soap = localData.getSoap(this.props.currentPatientKey, this.state.todayDate);
          if (soap) {
            this.setState({ formValues: soap });
          }

          this.props.setLoading(false);
        }
      })
      .catch( (err) => {
        if (this.props.loading) {
          this.props.setErrorMessage(err.message);
          this.props.setLoading(false);
        }
      });
  }

  componentDidMount() {
    this.syncAndLoadFormValues();
  }

  submit = () => {
    if(!this.refs.form.validate().isValid()) {
      this.props.setErrorMessage('Form not correct. Review form.');
      return;
    }
    const form = this.refs.form.getValue();
    const soap = Soap.extractFromForm(form, this.props.currentPatientKey);

    // Update local data first
    this.props.setLoading(true);
    this.props.isUploading(true);
    this.props.clearMessages();

    try {
      localData.updateSoap(soap);
    } catch(e) {
      this.props.setErrorMessage(e.message);
      this.props.setLoading(false);
      return;
    }

    // Send updates to server
    serverData.updateSoap(soap)
      .then( () => {
        if(this.props.loading) {
          this.props.setLoading(false);
          this.props.setSuccessMessage('Saved');
        }
      })
      .catch( (err) => {
        if(this.props.loading) {
          this.props.setLoading(false, true);
          this.props.setErrorMessage(err.message);
          return;
        }
      });
  }

  onFormChange = (value) => {
    this.setState({
      formValues: value,
    });
  }

  render() {
    return (
      <Container>
        <Text style={styles.title}>
          Soap
        </Text>

        <View style={styles.form}>
          <Form ref="form"
            type={this.Soap}
            value={this.state.formValues}
            options={this.formOptions}
            onChange={this.onFormChange}
          />

          <Button onPress={this.submit}
            style={styles.updateButton}
            text="Update" />
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
import { setLoading, setSuccessMessage, setErrorMessage, clearMessages, isUploading } from '../reduxActions/containerActions';
import { connect } from 'react-redux';

const mapStateToProps = state => ({
  loading: state.loading,
  currentPatientKey: state.currentPatientKey
});

const mapDispatchToProps = dispatch => ({
  setLoading: (val,showRetryButton) => dispatch(setLoading(val, showRetryButton)),
  setErrorMessage: val => dispatch(setErrorMessage(val)),
  setSuccessMessage: val => dispatch(setSuccessMessage(val)),
  clearMessages: () => dispatch(clearMessages()),
  isUploading: val => dispatch(isUploading(val))
});

export default connect(mapStateToProps, mapDispatchToProps)(SoapScreen);
