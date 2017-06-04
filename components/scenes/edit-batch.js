import React, { Component } from 'react';
// TODO: on iOS may need to add KeyboardAvoidingView or wrap this in one?
// TODO: iOS date stuff
// TODO: max lengths on text inputs
// TODO: make picker.android.js and picker.ios.js to use here
//        picker.android.js would use Picker, picker.ios.js would use PickerIOS
import { View, Text, TextInput, Button, Picker, Switch, ScrollView } from 'react-native';

// TODO: refactor these out into a DatePicker component
import { DatePickerAndroid, DatePickerIOS, TouchableWithoutFeedback} from 'react-native';

import { connect } from 'react-redux';
import { PropTypes } from 'prop-types';
import { styles as s } from "react-native-style-tachyons";

import Row from '../batch-list-row';
import { getBatch, createBatch, updateBatch } from '../../utils/api-client';
import { KeyboardTypes, VolumeUnits, styles } from '../../constants';
// TODO: move fermenters to a redux store?
import { getAllFermenters } from '../../utils/api-client';

class EditBatch extends Component {
  // TODO: Make this a function, get at whether we have a batch or not and set to
  // Adding or Editing Batch
  // no headerRight button.  react-navigation does not implement nav in a way which
  // sanely lets you put a button, such as a save button, which needs to operate on
  // current state/props. :
  static navigationOptions = ({ navigation, screenProps }) => ({
    title: 'Batch',
    // headerRight: <Button title={"Save"} onPress={(navigation) => {console.log(navigation.state)}} />
  });

  constructor(props) {
    super(props);

    const currentTime = new Date();

    const defaultBatch = {
      name: '',
      brewNotes: '',
      tastingNotes: '',
      brewDate: currentTime,
      bottleDate: null,
      estimatedBottlingDate: null,
      estimatedDrinkableDate: null,
      volumeUnits: VolumeUnits.GALLONS,
      fermenterVolume: null,
      recipeUrl: '',
      fermenterId: null,
      // TODO: add the rest of these properties to the view

      originalGravity: null,
      boilVolume: null,
      bottledVolume: null,
      secondaryFermenterDate: null,
      finalGravity: null,

    }

    // need to copy this object
    let b = this.props.batch || defaultBatch;
    // TODO: improve this whole thing to use state.batch as an immutablejs object
    this.state = {
      batch: Object.assign({}, b),
      requestingBatch: false,
      saveSuccess: false,
      saveError: false,
      editingExisting: !!(this.props.batch && this.props.batch.id),
      batchId: b.id,
      fermenters: []
    };
  }

  // batches in Redux store version
  componentWillReceiveProps(nextProps) {
    // should this go into componentDidUpdate and use this.props?
    if (nextProps.auth.jwt && !this.state.isRequesting && nextProps.batchId && !this.state.batch) {
      this.loadBatch(nextProps.auth.jwt);
    }

    if (this.props.auth.jwt && !this.state.isRequestingFermenters && !this.state.fermenters.length > 0) {
      this.loadFermenters(this.props.auth.jwt);
    }
  }

  componentDidMount() {
    // mounting happens different with react-native 0.44 and react-navigation
    // so we need to look these up here or maybe just do it in render?  that way
    // a little loading thing could be displayed
    if (this.props.auth.jwt && !this.state.isRequesting && this.props.batchId && !this.state.batch) {
      this.loadBatch(this.props.auth.jwt);
    }

    if (this.props.auth.jwt && !this.state.isRequestingFermenters) {
      this.loadFermenters(this.props.auth.jwt);
    }
  }

  // Are we updating an existing batch or creating a new one?
  isUpdating = () => {
    return !!this.state.batchId
  };

  _volumeFieldDisplayValue = () => {
    if (typeof this.state.batch.volume !== "string") {
      return this.state.batch.volume.toString();
    }
    return this.state.batch.volume;
  };

  setNameFromInput = (name) => {
    // TODO: Use immutablejs and make life easier
    // IS THIS SAFE?
    this.setState((prevState, props) => {
      return {batch: Object.assign({}, prevState.batch, {name: name})}
    });
  }

  setBatchUnits = (volumeUnits) => {
    this.setState((prevState, props) => {
      return {batch: Object.assign({}, prevState.batch, {volumeUnits: volumeUnits})}
    });
  }

  setBatchVolume = (volume) => {
    this.setState((prevState, props) => {
      return {batch: Object.assign({}, prevState.batch, {volume: volume})}
    });
  }

  setDescription = (description) => {
    this.setState((prevState, props) => {
      return {batch: Object.assign({}, prevState.batch, {description: description})}
    });
  };

  setBrewNotes = (brewNotes) => {
    this.setState((prevState, props) => {
      return {batch: Object.assign({}, prevState.batch, {brewNotes: brewNotes})}
    });
  };

  setTastingNotes = (tastingNotes) => {
    this.setState((prevState, props) => {
      return {batch: Object.assign({}, prevState.batch, {tastingNotes: tastingNotes})}
    });
  };

  setRecipeUrl = (recipeUrl) => {
    this.setState((prevState, props) => {
      return {batch: Object.assign({}, prevState.batch, {recipeUrl: recipeUrl})}
    });
  };

  setOriginalGravity = (originalGravity) => {
    this.setState((prevState, props) => {
      return {batch: Object.assign({}, prevState.batch, {originalGravity: originalGravity})}
    });
  };

  setFinalGravity = (finalGravity) => {
    this.setState((prevState, props) => {
      return {batch: Object.assign({}, prevState.batch, {finalGravity: finalGravity})}
    });
  };

  setBoilVolume = (boilVolume) => {
    this.setState((prevState, props) => {
      return {batch: Object.assign({}, prevState.batch, {boilVolume: boilVolume})}
    });
  };

  setBottledVolume = (bottledVolume) => {
    this.setState((prevState, props) => {
      return {batch: Object.assign({}, prevState.batch, {bottledVolume: bottledVolume})}
    });
  };

  setFinalGravity = (finalGravity) => {
    this.setState((prevState, props) => {
      return {batch: Object.assign({}, prevState.batch, {finalGravity: finalGravity})}
    });
  };

  setFermenterId = (fermenterId) => {
    // or just set the fermenter and extract id for create/update?
    this.setState((prevState, props) => {
      return {batch: Object.assign({}, prevState.batch, {fermenterId: fermenterId})}
    });
  }

  setBrewDate = async (brewDate) => {
    let updatedDate = await this.showAndroidPicker({date: brewDate});
    this.setState((prevState, props) => {
      let currentDate = prevState.batch.brewDate;
      if(updatedDate && updatedDate != currentDate) {
        return {batch: Object.assign({}, prevState.batch, {brewDate: updatedDate})}
      } else {
        return {batch: Object.assign({}, prevState.batch, {brewDate: currentDate})}
      }
    });
  };

  setBottleDate = async (bottleDate) => {
    if (!bottleDate) {
      bottleDate = new Date();
    }
    let updatedDate = await this.showAndroidPicker({date: bottleDate});
    this.setState((prevState, props) => {
      let currentDate = prevState.batch.bottleDate;
      if(updatedDate && updatedDate != currentDate) {
        return {batch: Object.assign({}, prevState.batch, {bottleDate: updatedDate})}
      } else {
        return {batch: Object.assign({}, prevState.batch, {bottleDate: currentDate})}
      }
    });
  };

  setSecondaryFermenterDate = async (secondaryFermenterDate) => {
    let updatedDate = await this.showAndroidPicker({date: secondaryFermenterDate});
    this.setState((prevState, props) => {
      let currentDate = prevState.batch.secondaryFermenterDate;
      if(updatedDate && updatedDate != currentDate) {
        return {batch: Object.assign({}, prevState.batch, {secondaryFermenterDate: secondaryFermenterDate})}
      } else {
        return {batch: Object.assign({}, prevState.batch, {secondaryFermenterDate: currentDate})}
      }
    });
  };

  // Show the date picker for Android and return the selected date
  showAndroidPicker = async (options) => {
    try {
      const {action, year, month, day} = await DatePickerAndroid.open(options);
      if (action === DatePickerAndroid.dismissedAction) {
        return null;
      } else {
        var date = new Date(year, month, day);
        return date;
      }

    } catch ({code, message}) {
      // TODO: properly handle this!!!
      console.warn(`Error in example `, message);
      return null;
    }
  };

  /* Make request to add a batch */
  addBatch = () => {
    // TODO:
    // deal with int and float units which may be strings but need to be int or float types
    // edit fermenter has hacky kludge, but must be a better way, such as when setting the state.
    createBatch(this.state.batch, this.props.auth.jwt).then((responseJson) => {

      // { data: { createBatch: { id: '1' } } }
      if (responseJson.data && responseJson.data.createBatch && responseJson.data.createBatch.id) {
        this.setState({
          saveSuccess: true,
          saveError: false,
          batchId: responseJson.data.createBatch.id,
          editingExisting: true
        });
      }
    }).catch((error) => {
        console.log(error);
        this.setState({saveSuccess: false, saveError: true})
    });
  };

  /* Make request to update a batch */
  editBatch = () => {
    // TODO:
    // deal with int and float units which may be strings but need to be int or float types
    // edit fermenter has hacky kludge, but must be a better way, such as when setting the state.
    updateBatch(this.state.batchId, this.state.batch, this.props.auth.jwt).then((responseJson) => {
      // { data: { createBatch: { id: '1' } } }
      if (responseJson.data && responseJson.data.updateBatch && responseJson.data.updateBatch.id) {
        this.setState({
          saveSuccess: true,
          saveError: false,
          batchId: responseJson.data.updateBatch.id,
          editingExisting: true
        });
      }
    }).catch((error) => {
        console.log(error);
        this.setState({saveSuccess: false, saveError: true})
    });
  };

  render() {
    let statusMessage = null;
    if (this.state.saveError) {
      statusMessage = <View style={[s.ma1, s.mb2, s.jcfs, s.pa2, s.bg_red, s.h3, s.mb1]}><Text>Error Saving Batch</Text></View>;
    } else if (this.state.saveSuccess) {
      statusMessage = <View style={[s.ma1, s.mb2, s.jcfs, s.pa2, s.bg_greenyellow, s.h3, s.mb1]}><Text>Batch Saved</Text></View>;
    }

    // TODO: better handling of batch type choices
    return (
      <ScrollView style={[s.ma1]}>
        <Text style={[s.mv3, s.f1]}>{this.isUpdating() ? "Editing" : "Create" } Batch</Text>
        { statusMessage }

        <View style={[s.bt, s.bb]}>
          <Text style={[s.mv3, s.f3]}>Basic Properties</Text>
          <Text>Name</Text>
          <TextInput
            style={[s.b__gray, s.h3, s.pb2, s.ma1, s.ba]}
            onChangeText={this.setNameFromInput}
            value={this.state.batch.name}
          />

          <TouchableWithoutFeedback
            onPress={this.setBrewDate.bind(this, this.state.batch.brewDate)}
          >
          <View>
            <Text>Brew Date</Text>
            <TextInput
              style={[s.b__gray, s.h3, s.pb2, s.ma1, s.ba, s.black]}
              underlineColorAndroid='dimgrey'
              value={this.state.batch.brewDate.toString()}
              onFocus={this.setBrewDate.bind(this, this.state.batch.brewDate)}
              editable={false} /></View>
          </TouchableWithoutFeedback>

          <Text style={[s.mt2]}>Fermenter</Text>
          <Picker selectedValue={this.state.batch.fermenterId}
            style={[s.h2, s.mb3, s.b__gray]}
            onValueChange={this.setFermenterId}
            mode={'dialog'}
            prompt={'Select a fermenter for this batch'}
          >
            {[...this.state.fermenters.map((x, i) =>
              <Picker.Item key={x.id} label={x.name} value={x.id} />
            )]}
          </Picker>

        </View>
        <View style={[s.bb_black, s.bt_black]}>
          <Text style={[s.mv3, s.f3]}>Advanced Properties</Text>

          <Text>Recipe URL</Text>
          <TextInput
            style={[s.b__gray, s.h3, s.pb2, s.ma1, s.ba]}
            onChangeText={this.setRecipeUrl}
            value={this.state.batch.recipeUrl}
            keyboardType={"url"}
            autoCorrect={false}
            autoCapitalize={'none'}
          />

          <Text style={[s.mt2]}>Volume Units</Text>
          <Picker selectedValue={this.state.batch.volumeUnits}
            onValueChange={this.setBatchUnits}
            style={[s.h2, s.mb3, s.b__gray]}
          >
            <Picker.Item label="Gallons" value={VolumeUnits.GALLONS} />
            <Picker.Item label="Liters" value={VolumeUnits.LITERS} />
          </Picker>

          <Text>Volume In Fermenter</Text>
          <TextInput
            style={{height: 40, borderColor: 'gray', borderWidth: 1, }}
            onChangeText={this.setBatchVolume}
            value={this.state.batch.fermenterVolume}
            keyboardType={'numeric'}
            style={[s.b__gray, s.h3, s.pb2, s.ma1, s.ba]}
          />

          <Text>Short Description</Text>
          <TextInput
            onChangeText={this.setDescription}
            value={this.state.batch.description}
            multiline={true}
            style={[s.b__gray, s.ma1, s.ba, s.tl, {textAlignVertical: 'top'}]}
            numberOfLines={5}
            underlineColorAndroid='dimgrey'
          />

          <Text>Brew Day Notes</Text>
          <TextInput
            onChangeText={this.setBrewNotes}
            value={this.state.batch.brewNotes}
            multiline={true}
            style={[s.b__gray, s.ma1, s.ba, s.tl, {textAlignVertical: 'top'}]}
            numberOfLines={5}
            underlineColorAndroid='dimgrey'
          />

          <TouchableWithoutFeedback onPress={this.setBottleDate.bind(this, this.state.batch.bottleDate)}>
            <View>
              <Text>Bottled Date</Text>
              <TextInput
                style={[s.b__gray, s.h3, s.pb2, s.ma1, s.ba, s.black]}
                underlineColorAndroid='dimgrey'
                value={this.state.batch.bottleDate ? this.state.batch.bottleDate.toString() : ''}
                onFocus={this.setBottleDate.bind(this, this.state.batch.bottleDate)}
                editable={false} />
            </View>
          </TouchableWithoutFeedback>

          <Text>Tasting Notes</Text>
          <TextInput
            onChangeText={this.setTastingNotes}
            value={this.state.batch.tastingNotes}
            multiline={true}
            style={[s.b__gray, s.ma1, s.ba, s.tl, {textAlignVertical: 'top'}]}
            numberOfLines={5}
            underlineColorAndroid='dimgrey'
          />
        </View>
        <Button title="Save" onPress={this.isUpdating() ? this.editBatch : this.addBatch} />
      </ScrollView>
    );
  }

  /*
   * Load batch from the API.  Useful for a refresh/reset functionality
   */
  loadBatch = (jwt = null, batchId = null) => {
    jwt = jwt || this.props.auth.jwt;
    batchId = batchId || this.props.batchId;
    getBatch(batchId, jwt).then((responseJson) => {
      const retrievedBatch = responseJson.data.batch;
      this.setState({
        batch: retrievedBatch,
      });
    });
  }

  /*
   * Load fermenters into state to be used for the fermenter selection
   */
  loadFermenters = (jwt = null) => {
    this.setState({isRequestingFermenters: true});
    jwt = jwt || this.props.auth.jwt;
    getAllFermenters(jwt, filters={isAvailable: true, isActive: true}).then((responseJson) => {
      const retrievedFermenters = responseJson.data.fermenters.slice();
      this.setState({
        fermenters: retrievedFermenters,
        isRequestingFermenters: false
      });
    });
  };
};

EditBatch.propTypes = {
  batch: PropTypes.object,
  dispatch: PropTypes.func.isRequired,
  // nav: PropTypes.object.isRequired,
};


const mapStateToProps = (state, props) => {
  // batch we need for props should be in props.navigation.state.params
  return {
    auth: state.auth,
    navigation: props.navigation,
    ...props.navigation.state.params
  }
};


export default connect(mapStateToProps)(EditBatch);
