import OptionFieldText from './option-fields/option-field-text.js';
import OptionFieldSelect from './option-fields/option-field-select.js';
import OptionFieldBoolean from './option-fields/option-field-boolean.js';

export default class OptionsFieldFactory {

  /**
   * Produce an option field based on the given field definition and value.
   * @param {object} [field] Field definition.
   * @param {string|number|object|object[]} [value] Value for the field.
   * @param {object} [dictionary] Dictionary for translations.
   * @returns {OptionFieldText|OptionFieldSelect|OptionFieldBoolean|null} The created option field or null.
   */
  static produce(field = {}, value, dictionary) {
    let type = field.type;
    if (field.widget) {
      type = `${type}/${field.widget}`;
    }

    return this.createField(type, field, value, dictionary);
  }

  /**
   * Create an option field based on the type.
   * @param {string} type Type of the field.
   * @param {object} field Field definition.
   * @param {string|number|object|object[]} value Value for the field.
   * @param {object} dictionary Dictionary for translations.
   * @returns {OptionFieldText|OptionFieldSelect|OptionFieldBoolean|null} The created option field or null.
   */
  static createField(type, field, value, dictionary) {
    switch (type) {
      case 'text':
        return new OptionFieldText(field, value, dictionary);
      case 'select':
        return new OptionFieldSelect(field, value, dictionary);
      case 'boolean':
        return new OptionFieldBoolean(field, value, dictionary);
      default:
        return null;
    }
  }
}
