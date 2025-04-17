import Util from '@services/util.js';
import H5PUtil from '@services/h5p-util.js';
import Dictionary from '@services/dictionary.js';
import Globals from '@services/globals.js';
import Exercise from '@components/exercise/exercise.js';
import OverlayDialog from '@components/overlay-dialog/overlay-dialog.js';
import '@styles/h5p-editable-medium.scss';

/** @constant {string} Default description */
const DEFAULT_DESCRIPTION = 'Editable Medium';

export default class EditableMedium extends H5P.EventDispatcher {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super();

    const defaults = Util.extend(H5PUtil.getSemanticsDefaults(), {
      contentType: {
        library: `H5P.Image ${H5PUtil.getLibraryVersion('H5P.Image')}`,
        params: {},
        subContentId: H5P.createUUID()
      },
      viewFieldsImage: {
        sizingMode: params?.behaviour?.sizingMode ?? 'contain',
      },
      viewFieldsAudio: {
        playerMode: params?.contentType?.params?.playerMode ?? 'full'
      },
      viewFieldsVideo: {},
    });
    this.params = Util.extend(defaults, params);

    this.getDescription();

    this.contentId = contentId;
    this.extras = extras;

    this.previousState = this.extras.previousState || {};

    if (this.previousState.viewFields) {
      Object.keys(this.previousState.viewFields).forEach((type) => {
        const viewFieldsName = `viewFields${type}`;
        this.params[viewFieldsName] = this.previousState.viewFields[type];
      });
    }

    this.globals = new Globals();
    this.globals.set('contentId', this.contentId);
    this.globals.set('mainInstance', this);

    this.dictionary = new Dictionary();
    this.dictionary.fill({ l10n: this.params.l10n, a11y: this.params.a11y });

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editable-medium-main');

    const subContentMachineName = this.getSubcontentMachineName();
    const viewFieldsName = `viewFields${subContentMachineName.replace('H5P.', '')}`;

    this.overlayDialog = new OverlayDialog(
      {
        globals: this.globals,
        dictionary: this.dictionary,
        machineName: subContentMachineName,
        values: this.params[viewFieldsName]
      },
      {
        onSaved: (viewFieldsName, params = []) => {
          params.forEach((param) => {
            this.params[viewFieldsName][param.name] = param.value;
          });

          this.updateExercise();
        }
      }
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

  openEditorDialog(params = {}) {
    this.overlayDialog.show({
      activeElement: params.activeElement,
    });
  }

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
   * Get task title.
   * @returns {string} Title.
   */
  getTitle() {
    // H5P Core function: createTitle
    return H5P.createTitle(
      this.extras?.metadata?.title || this.getDescription(),
    );
  }

  /**
   * Get machine name of subcontent.
   * @returns {string} Machine name or empty string.
   */
  getSubcontentMachineName() {
    return this.params.contentType.library.split(' ')?.[0] ?? '';
  }

  /**
   * Get description.
   * @returns {string} Description.
   */
  getDescription() {
    const type = this.getSubcontentMachineName().replace('H5P.', '');
    return type ? `${DEFAULT_DESCRIPTION} (${type})` : DEFAULT_DESCRIPTION;
  }

  getCurrentState() {
    const type = this.getSubcontentMachineName().replace('H5P.', '');
    const state = { exercise: this.exercise.getCurrentState() };
    const viewFieldsName = `viewFields${type}`;

    if (type) {
      state.viewFields = {};
      state.viewFields[type] = this.params[viewFieldsName];
    }

    return state;
  }

  /**
   * Get summary text.
   * @returns {string} Summary text.
   */
  getSummary() {
    return this.exercise.getSummary();
  }
}
