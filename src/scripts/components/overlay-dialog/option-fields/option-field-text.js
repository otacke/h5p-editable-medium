
import OptionField from '../option-field.js';
import './option-field-text.scss';

export default class OptionFieldText extends OptionField {

  /**
   * @class
   * @param {object} [field] Field definition.
   * @param {string|number|object|object[]} [value] Value for the field.
   * @param {object} [dictionary] Dictionary for translations.
   */
  constructor(field = {}, value, dictionary) {
    super(field, value, dictionary);

    // Deviating from semantics spec to support multiple regexps
    if (typeof this.field.regexp !== 'object' || this.field.regexp === null) {
      this.field.regexp = {};
    }

    this.contentDOM = document.createElement('input');
    this.contentDOM.classList.add('h5p-editable-medium-overlay-dialog-option-field-text-input');
    this.contentDOM.setAttribute('id', `field-${this.uuid}`);
    this.contentDOM.setAttribute('type', 'text');
    this.contentDOM.setAttribute('placeholder', this.field.placeholder || '');
    this.contentDOM.setAttribute('spellcheck', 'false');
    this.contentDOM.setAttribute('autocomplete', 'off');
    if (this.description) {
      this.contentDOM.setAttribute('aria-describedby', `field-${this.uuid}-description`);
    }

    this.contentDOM.value = value ?? this.field.defaultValue ?? '';

    this.contentDOM.addEventListener('blur', () => {
      if (
        this.contentDOM.value &&
        !this.contentDOM.value.startsWith('http://') &&
        !this.contentDOM.value.startsWith('https://')
      ) {
        this.contentDOM.value = `https://${this.contentDOM.value}`;
      }
      this.validate();
    });

    this.contentDOM.addEventListener('input', () => {
      this.setError();
    });

    const newDOM = this.contentDOM;
    this.content.replaceWith(newDOM);
    this.content = newDOM;
  }

  /**
   * Get the current value of the field.
   * @returns {object} Object containing the name and value of the field.
   */
  getValue() {
    return {
      name: this.field.name,
      value: this.contentDOM.value,
    };
  }

  /**
   * Reset the field.
   */
  reset() {
    this.contentDOM.value = '';
    this.setError();
  }

  /**
   * Determine whether the field is valid.
   * @returns {boolean} True if the field is valid, false otherwise.
   */
  isValid() {
    const value = this.contentDOM.value.trim();
    if (value === '') {
      return !!this.field.optional;
    }

    if (typeof this.field.regexp.pattern !== 'string') {
      return true;
    }

    const regexp = new RegExp(this.field.regexp.pattern, this.field.regexp.modifiers ?? '');
    return regexp.test(value);
  }

  /**
   * Valdidate the field.
   */
  validate() {
    if (this.isValid()) {
      this.setError();
      return;
    }

    let message = '';

    const value = this.contentDOM.value.trim();
    const regexp = new RegExp(this.field.regexp.pattern, this.field.regexp.modifiers ?? '');
    if (!regexp.test(value)) {
      message = [message, this.field.regexp.message].join(' ');
    }

    if (message) {
      this.setError(message);
      return;
    }
  }
}
