import Util from '@services/util.js';
import H5PUtil from '@services/h5p-util.js';
import Dictionary from '@services/dictionary.js';
import Globals from '@services/globals.js';
import Exercise from '@components/exercise/exercise.js';
import OverlayDialog from '@components/overlay-dialog/overlay-dialog.js';
import QuestionTypeContract from '@mixins/question-type-contract.js';
import XAPI from '@mixins/xapi.js';
import '@styles/h5p-editable-medium.scss';
import semantics from '@root/semantics.json';

/** @constant {string} DEFAULT_LANGUAGE_TAG Default language tag used if not specified in metadata. */
const DEFAULT_LANGUAGE_TAG = 'en';

export default class EditableMedium extends H5P.EventDispatcher {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super();

    Util.addMixins(EditableMedium, [QuestionTypeContract, XAPI]);

    this.translatedSemantics = {};

    const defaults = Util.extend(H5PUtil.getSemanticsDefaults(), {
      contentType: {
        library: `H5P.Image ${H5PUtil.getLibraryVersion('H5P.Image')}`,
        params: {},
        subContentId: H5P.createUUID(),
      },
      viewFieldsImage: {},
      viewFieldsAudio: {
        playerMode: params?.contentType?.params?.playerMode ?? 'full',
      },
      viewFieldsVideo: {},
    });
    this.params = Util.extend(defaults, params);

    this.initialParams = Util.clone(this.params);

    this.callbacks = {};

    this.contentId = contentId;
    this.extras = extras;

    this.wasAnswerGiven = false;

    this.language = extras?.metadata?.language || extras?.metadata?.defaultLanguage || DEFAULT_LANGUAGE_TAG;
    this.languageTag = Util.formatLanguageCode(this.language);

    this.previousState = this.extras.previousState || {};

    // Sync author values/user values
    if (this.previousState.viewFields) {
      Object.keys(this.previousState.viewFields).forEach((type) => {
        const viewFieldsName = `viewFields${type}`;
        this.params[viewFieldsName] = this.previousState.viewFields[type];
      });
    }
    else {
      const subContentMachineName = this.getSubcontentMachineName();
      if (subContentMachineName === 'H5P.Image') {
        this.params.viewFieldsImage.sizingMode = this.params.behaviour?.sizingMode;
      }
      if (subContentMachineName === 'H5P.Audio') {
        this.params.viewFieldsAudio.playerMode = this.params.contentType?.params?.playerMode || 'full';
      }
    }

    this.globals = new Globals();
    this.globals.set('contentId', this.contentId);
    this.globals.set('mainInstance', this);

    this.dictionary = new Dictionary();
    this.dictionary.fill({ l10n: this.params.l10n, a11y: this.params.a11y });

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editable-medium-main');

    const subContentMachineName = this.getSubcontentMachineName();
    this.viewFieldsName = `viewFields${subContentMachineName.replace('H5P.', '')}`;

    this.overlayDialog = new OverlayDialog(
      {
        globals: this.globals,
        dictionary: this.dictionary,
        machineName: subContentMachineName,
        fields: semantics.filter((field) => field.name === this.viewFieldsName)?.[0],
        values: this.params[this.viewFieldsName],
      },
      {
        onSaved: (params = [], isEditor) => {
          this.updateParams(params, isEditor);
        },
      },
    );

    this.updateExercise();

    if (this.params.behaviour.userCanEdit && !this.params.behaviour.delegateEditorDialog) {
      const button = document.createElement('button');
      button.classList.add('h5p-editable-medium-button');
      button.addEventListener('click', () => {
        this.overlayDialog.show({});
      });

      this.dom.append(button);
    }
  }

  /**
   * Update parameters of the content type.
   * @param {object[]} params Parameters to update.
   * @param {boolean} [isEditor] Whether the parameters are being updated from the editor.
   */
  updateParams(params, isEditor = false) {
    if (isEditor) {
      const paramsObject = Util.paramsArrayToPlainObject(params);
      this.params = paramsObject;

      if (this.viewFieldsName === 'viewFieldsImage') {
        this.params.viewFieldsImage.sizingMode = this.params.behaviour?.sizingMode;
      }
      else if (this.viewFieldsName === 'viewFieldsAudio') {
        this.params.viewFieldsAudio.playerMode = this.params.contentType.params?.playerMode;
      }
    }
    else {
      params.forEach((param) => {
        if (!this.wasAnswerGiven) {
          this.wasAnswerGiven = (this.params[this.viewFieldsName][param.name] ?? '') !== (param.value ?? '');
        }

        this.params[this.viewFieldsName][param.name] = param.value;
      });
    }

    this.updateExercise();
  }

  /**
   * Attach library to wrapper.
   * @param {H5P.jQuery} $wrapper Content's container.
   */
  attach($wrapper) {
    const wrapper = $wrapper.get(0);

    wrapper.classList.add('h5p-editable-medium');
    wrapper.appendChild(this.dom);

    Util.callOnceVisible(wrapper, () => {
      const h5pContainer = wrapper.closest('.h5p-container');
      (h5pContainer || document.body).append(this.overlayDialog.getDOM());
    });
  }

  /**
   * Open the editor dialog.
   * @param {object} [params] Parameters for opening the editor dialog.
   * @param {HTMLElement} [params.activeElement] Element to focus after the dialog is closed.
   */
  async openEditorDialog(params = {}) {
    if (typeof this.callbacks.passEditorDialog !== 'function') {
      this.overlayDialog.show({
        activeElement: params.activeElement,
      });

      return;
    }

    this.translatedSemantics.EditableMedium =
      this.translatedSemantics.EditableMedium ?? await H5PUtil.getTranslatedSemantics(this.language);

    const uberNameNoSpaces = this.getSubcontentUberName().replace(/ /g, '-');

    this.translatedSemantics[uberNameNoSpaces] =
      this.translatedSemantics[uberNameNoSpaces] ??
        await H5PUtil.getTranslatedSemantics(this.language, uberNameNoSpaces);

    const fieldsToPass = this.translatedSemantics.EditableMedium
      .filter((field) => field.name === this.viewFieldsName)?.[0]?.fields;
    const valuesToPass = this.params[this.viewFieldsName];

    const userParams = this.getExerciseState().main;
    const mergedParams = { ...this.params, ...userParams };

    this.callbacks.passEditorDialog(
      {
        versionedName: this.libraryInfo.versionedName,
        params: mergedParams,
        title: this.getTitle(),
        fields: fieldsToPass,
        values: valuesToPass,
      },
      {
        setValues: (newParams, isEditor) => {
          this.updateParams(newParams, isEditor);
          if (params.activeElement) {
            params.activeElement.focus();
          }
        },
      },
    );
  }

  /**
   * Update the exercise.
   */
  updateExercise() {
    const viewFieldsName = `viewFields${this.getSubcontentMachineName().replace('H5P.', '')}`;

    this.exercise = new Exercise({
      globals: this.globals,
      dictionary: this.dictionary,
      contentType: this.params.contentType,
      viewFields: this.params[viewFieldsName],
      previousState: this.previousState.exercise,
    });

    if (this.exerciseDOM) {
      const newDOM = this.exercise.getDOM();
      this.exerciseDOM.replaceWith(newDOM);
      this.exerciseDOM = newDOM;
    }
    else {
      this.exerciseDOM = this.exercise.getDOM();
      this.dom.append(this.exerciseDOM);
    }

    window.requestAnimationFrame(() => {
      this.trigger('resize');
    });
  }

  /**
   * Get machine name of subcontent.
   * @returns {string} Machine name or empty string.
   */
  getSubcontentMachineName() {
    return this.params.contentType.library.split(' ')?.[0] ?? '';
  }

  /**
   * Get Uber name of subcontent.
   * @returns {string} Uber name or empty string.
   */
  getSubcontentUberName() {
    return this.params.contentType.library ?? '';
  }

  /**
   * Set the callback for passing editor dialog.
   * @param {function} callback The callback function for editor dialog.
   */
  setPassEditorDialogCallback(callback) {
    this.callbacks.passEditorDialog = callback;
  }

  /**
   * Get summary text.
   * @returns {string} Summary text.
   */
  getSummary() {
    return this.exercise.getSummary();
  }

  /**
   * Get the state of the exercise.
   * @returns {object} The state of the exercise.
   */
  getExerciseState() {
    const type = this.getSubcontentMachineName().replace('H5P.', '');
    const state = { exercise: this.exercise.getCurrentState() };
    const viewFieldsName = `viewFields${type}`;

    if (type) {
      state.viewFields = {};
      state.viewFields[type] = this.params[viewFieldsName];
    }

    return state;
  }
}
