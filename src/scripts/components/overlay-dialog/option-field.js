import './option-field.scss';

export default class OptionField {
  /**
   * @class
   * @param {object} field Field definition.
   * @param {string|number|object|object[]} value Value for the field.
   * @param {object} dictionary Dictionary for translations.
   */
  constructor(field, value, dictionary) {
    this.field = field;

    this.dictionary = dictionary;

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editable-medium-overlay-dialog-option-field');
    this.dom.classList.add(field.type);

    this.uuid = H5P.createUUID();

    this.label = document.createElement('label');
    this.label.classList.add('h5p-editable-medium-overlay-dialog-option-field-label');
    this.label.setAttribute('for', `field-${this.uuid}`);
    this.label.innerText = field.label || '';
    this.dom.append(this.label);

    if (field.description) {
      this.description = document.createElement('div');
      this.description.classList.add('h5p-editable-medium-overlay-dialog-option-field-description');
      this.description.setAttribute('id', `field-${this.uuid}-description`);
      this.description.innerText = field.description;
      this.dom.append(this.description);
    }

    this.content = document.createElement('div');
    this.dom.append(this.content);

    this.error = document.createElement('div');
    this.error.classList.add('h5p-editable-medium-overlay-dialog-option-field-errors');
    this.dom.append(this.error);

    return this;
  }

  /**
   * Get the DOM element of the option field.
   * @returns {HTMLElement} DOM element of the option field.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get the value of the option field.
   * @returns {string|number|object|object[]|undefined} Value of the option field.
   */
  getValue() {
    return; // Must be implemented
  }

  /**
   * Check if the option field is valid.
   * @returns {boolean} True if the option field is valid, false otherwise.
   */
  isValid() {
    return true;
  }

  /**
   * Reset the option field to its initial state.
   */
  reset() {
    // Setting initial value needs to be implemented in subclasses
    this.setError();
  }

  /**
   * Validate the option field and update its error state.
   */
  validate() {
    this.dom.classList.toggle('has-error', !this.isValid());
  }

  /**
   * Set an error message for the option field.
   * @param {string} [message] Error message to display. If null or undefined, error state is cleared.
   */
  setError(message) {
    this.dom.classList.toggle('has-error', !!message);
    this.error.innerText = message ?? '';
  }
}
