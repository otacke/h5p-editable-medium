import OptionFieldText from './option-fields/option-field-text.js';
import OptionFieldSelect from './option-fields/option-field-select.js';
import OptionFieldBoolean from './option-fields/option-field-boolean.js';

export default class OptionsFieldFactory {
  static produce(field = {}, value, dictionary) {
    let type = field.type;
    if (field.widget) {
      type = `${type}/${field.widget}`;
    }

    return this.createField(type, field, value, dictionary);
  }

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
