import FocusTrap from '@services/focus-trap.js';
import Util from '@services/util.js';
import OptionFieldFactory from './option-field-factory.js';
import './overlay-dialog.scss';

/** Class representing an overlay dialog */
export default class OverlayDialog {

  /**
   * Overlay dialog.
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onCanceled: () => {},
      onSaved: () => {},
    }, callbacks);

    this.handleGlobalClick = this.handleGlobalClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editable-medium-overlay-dialog');
    this.dom.classList.toggle('open', false);
    if (this.params.cssMainSelector) {
      this.dom.classList.add(this.params.cssMainSelector);
    }
    this.dom.setAttribute('role', 'dialog');
    this.dom.setAttribute('aria-modal', 'true');

    // Container for H5P content, can be CSS-transformed
    this.contentContainer = document.createElement('div');
    this.contentContainer.classList.add(
      'h5p-editable-medium-overlay-dialog-content-container'
    );
    this.dom.append(this.contentContainer);

    this.content = document.createElement('div');
    this.content.classList.add('h5p-editable-medium-overlay-dialog-content');
    this.contentContainer.append(this.content);

    // Close button
    this.buttonClose = document.createElement('button');
    this.buttonClose.classList.add('h5p-editable-medium-overlay-dialog-button-close');
    this.buttonClose.setAttribute(
      'aria-label', this.params.dictionary.get('a11y.close')
    );
    this.buttonClose.addEventListener('click', () => {
      this.cancel();
    });
    this.contentContainer.append(this.buttonClose);

    // Headline
    const headline = document.createElement('div');
    headline.classList.add('h5p-editable-medium-overlay-dialog-headline');
    this.content.append(headline);

    this.headlineText = document.createElement('div');
    this.headlineText.classList.add('h5p-editable-medium-overlay-dialog-headline-text');
    headline.append(this.headlineText);

    this.contentContainer = document.createElement('div');
    this.contentContainer.classList.add('h5p-editable-medium-overlay-dialog-options-container');
    this.content.append(this.contentContainer);

    this.focusTrap = new FocusTrap({
      trapElement: this.dom,
      closeElement: this.buttonClose,
      fallbackContainer: this.contentContainer
    });

    this.setTitle(this.params.fields?.label || '');
    this.formFields = this.params.fields.fields
      .map((field) => OptionFieldFactory.produce(field, this.params.values[field.name], this.params.dictionary))
      .filter((field) => field !== undefined && field !== null);

    this.formFields.forEach((field) => {
      this.contentContainer.appendChild(field.getDOM());
    });

    const buttonRow = document.createElement('div');
    buttonRow.classList.add('h5p-editable-medium-overlay-dialog-button-row');
    this.contentContainer.append(buttonRow);

    this.saveButton = document.createElement('button');
    this.saveButton.classList.add('h5p-editable-medium-overlay-dialog-button');
    this.saveButton.classList.add('save');
    this.saveButton.innerText = this.params.dictionary.get('l10n.save');
    this.saveButton.addEventListener('click', () => {
      this.save();
    });
    buttonRow.append(this.saveButton);

    const cancelButton = document.createElement('button');
    cancelButton.classList.add('h5p-editable-medium-overlay-dialog-button');
    cancelButton.classList.add('cancel');
    cancelButton.innerText = this.params.dictionary.get('l10n.cancel');
    cancelButton.addEventListener('click', () => {
      this.cancel();
    });
    buttonRow.append(cancelButton);
  }

  /**
   * Get DOM for exercise.
   * @returns {HTMLElement} DOM for exercise.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Handle error state changed.
   * @param {boolean} hasError Whether there is an error.
   */
  handleErrorStateChanged(hasError) {
    this.saveButton.disabled = hasError;
  }

  /**
   * Save the form parameters.
   */
  save() {
    const isInputValid = this.formFields.every((field) => field.isValid());
    if (!isInputValid) {
      this.formFields.forEach((field) => {
        field.validate();
      });

      return;
    }

    this.hide();

    const values = this.formFields.map((field) => {
      return field.getValue();
    });

    this.callbacks.onSaved(values);
  }

  /**
   * Show.
   * @param {object} [params] Parameters.
   * @param {HTMLElement} [params.activeElement] Element to return focus to.
   */
  show(params = {}) {
    this.returnFocusTo = params.activeElement ?? document.activeElement;

    this.dom.classList.toggle('open', true);

    // Wait to allow DOM to progress
    window.requestAnimationFrame(() => {
      this.focusTrap.activate();

      document.addEventListener('click', this.handleGlobalClick);
      document.addEventListener('keydown', this.handleKeyDown);

      this.params.globals.get('mainInstance').trigger('resize');
    });
  }

  /**
   * Hide.
   */
  hide() {
    document.removeEventListener('click', this.handleGlobalClick);
    document.removeEventListener('keydown', this.handleKeyDown);

    this.dom.classList.toggle('open', false);

    this.focusTrap.deactivate();

    if (this.returnFocusTo && this.returnFocusTo.isConnected) {
      window.requestAnimationFrame(() => {
        this.returnFocusTo.focus();
      });
    }
  }

  /**
   * Cancel the dialog.
   */
  cancel() {
    this.hide();
    this.formFields.forEach((field) => {
      if (!field.isValid()) {
        field.reset();
      }
    });

    this.callbacks.onCanceled();
  }

  /**
   * Set DOM content.
   * @param {HTMLElement} dom DOM of content.
   */
  setContent(dom) {
    this.contentContainer.innerHTML = '';
    this.contentContainer.appendChild(dom);
  }

  /**
   * Set headline text.
   * @param {string} text Headline text to set.
   */
  setTitle(text) {
    text = Util.purifyHTML(text);

    this.headlineText.innerText = text;
    this.dom.setAttribute('aria-label', text);
  }

  /**
   * Handle global click event.
   * @param {Event} event Click event.
   */
  handleGlobalClick(event) {
    if (!event.target.isConnected || this.content.contains(event.target)) {
      return;
    }

    this.cancel();
  }

  /**
   * Handle key down.
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel();
    }
  }
}
