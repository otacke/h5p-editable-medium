import OptionField from '../option-field.js';
import './option-field-select.scss';

export default class OptionFieldSelect extends OptionField {

  /**
   * @class
   * @param {object} [field] Field definition.
   * @param {string|number|object|object[]} [value] Value for the field.
   * @param {object} [dictionary] Dictionary for translations.
   */
  constructor(field = {}, value, dictionary) {
    super(field, value, dictionary);

    this.contentDOM = document.createElement('input');
    this.contentDOM.classList.add('h5p-editable-medium-overlay-dialog-option-field-boolean');
    this.contentDOM.setAttribute('id', `field-${this.uuid}`);
    if (this.description) {
      this.contentDOM.setAttribute('aria-describedby', `field-${this.uuid}-description`);
    }
    this.contentDOM.setAttribute('type', 'checkbox');
    this.contentDOM.checked = value ?? (this.field.default || false);

    this.contentDOM.addEventListener('blur', () => {
      this.validate();
    });

    this.contentDOM.addEventListener('input', () => {
      this.setError();
    });

    const newDOM = this.contentDOM;
    this.content.replaceWith(newDOM);
    this.content = newDOM;

    // Move checkbox in front of label
    const contentIndex = Array.from(this.dom.children).indexOf(this.content);
    const labelIndex = Array.from(this.dom.children).indexOf(this.label);
    if (contentIndex > labelIndex) {
      this.dom.insertBefore(this.content, this.label);
    }
  }

  /**
   * Reset the field.
   */
  reset() {
    this.contentDOM.checked = this.field.default || false;
    this.setError();
  }

  /**
   * Get the current value of the field.
   * @returns {object} Object containing the name and value of the field.
   */
  getValue() {
    return {
      name: this.field.name,
      value: this.contentDOM.checked,
    };
  }
}
