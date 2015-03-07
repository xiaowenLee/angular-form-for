module formFor {

  /**
   * RadioField $scope.
   */
  interface RadioFieldScope extends ng.IScope {

    /**
     * Name of the attribute within the parent form-for directive's model object.
     * This attributes specifies the data-binding target for the input.
     * Dot notation (ex "address.street") is supported.
     */
    attribute:string;

    /**
     * This RadioField is currently selected for its group.
     */
    checked:boolean;

    /**
     * Click handler; toggles radio group selected value.
     */
    click:Function;

    /**
     * Disable input element.
     * Note the name is disable and not disabled to avoid collisions with the HTML5 disabled attribute.
     */
    disable:boolean;

    /**
     * Optional help tooltip to display on hover.
     * By default this makes use of the Angular Bootstrap tooltip directive and the Font Awesome icon set.
     */
    help?:string;

    /**
     * Only the primary <radio> input should show error message text.
     * If TRUE, this indicates that the current RadioField is not the primary <radio> and so should not show the error.
     */
    hideErrorMessage?:boolean;

    /**
     * Optional field label displayed after the radio input.
     * Although not required, it is strongly suggested that you specify a value for this attribute.
     * HTML is allowed for this attribute
     */
    label?:string;

    /**
     * Shared between formFor and RadioField directives.
     * This same data is also shared between all <radio> instances of the current radio group.
     */
    model:BindableFieldWrapper;

    /**
     * Optional custom tab index for input; by default this is 0 (tab order chosen by the browser).
     */
    tabIndex?:number;

    /**
     * Optional ID to assign to the inner <input type="checkbox"> element;
     * A unique ID will be auto-generated if no value is provided.
     */
    uid:string;

    /**
     * Value to be assigned to model if this radio component is selected.
     */
    value:any;
  }

  /**
   * Radio group information shared between all RadioField instances.
   * This data is created by the first RadioField and shared among all others.
   */
  interface RadioGroupDatum {

    /**
     * The primary RadioField $scope; primary in this case just means the first to register.
     */
    defaultScope:RadioFieldScope;

    /**
     * All RadioField $scopes in this group.
     */
    scopes:Array<RadioFieldScope>;
  }

  /**
   * Renders a radio &lt;input&gt; with optional label.
   * This type of component is well-suited for small enumerations.
   *
   * @example
   * // To render a radio group for gender selection you might use the following markup:
   * <radio-field label="Female" attribute="gender" value="f"></radio-field>
   * <radio-field label="Male" attribute="gender" value="m"></radio-field>
   */
  export class RadioField implements ng.IDirective {

    require:string = '^formFor';
    restrict:string = 'EA';
    templateUrl:string = 'form-for/templates/radio-field.html';

    scope:any = {
      attribute: '@',
      disable: '=',
      help: '@?',
      value: '@'
    };

    private $log_:ng.ILogService;
    private fieldHelper_:FieldHelper;
    private fieldNameToActiveRadioGroupDatumMap_:{[fieldName:string]:RadioGroupDatum};

    /**
     * Constructor.
     *
     * @param $log $injector-supplied $log service
     * @param FormForConfiguration
     */
    constructor($log, FormForConfiguration) {
      this.$log_ = $log;

      this.fieldHelper_ = new FieldHelper(FormForConfiguration);
      this.fieldNameToActiveRadioGroupDatumMap_ = {};
    }

    link($scope:RadioFieldScope, $element:ng.IAugmentedJQuery, $attributes:ng.IAttributes, formForController:FormForController):void {
      if (!$scope.attribute) {
        this.$log_.error('Missing required field "attribute"');

        return;
      }

      if (!this.fieldNameToActiveRadioGroupDatumMap_[$scope.attribute]) {
        this.fieldHelper_.manageFieldRegistration($scope, $attributes, formForController);

        this.fieldNameToActiveRadioGroupDatumMap_[$scope.attribute] = {
          defaultScope: $scope,
          scopes: []
        };

      } else {
        // Only the primary <radio> input should show error message text
        $scope.hideErrorMessage = true;
      }

      // Everything inside of  $scope.model pertains to the first <input type="radio"> for this attribute/name.
      // In order for our view's aria-* and label-for tags to function properly, we need a unique uid for this instance.
      $scope.uid = $attributes['uid'] || FormForGUID.create();

      var radioGroupDatum = this.fieldNameToActiveRadioGroupDatumMap_[$scope.attribute];
      radioGroupDatum.scopes.push($scope);

      this.fieldHelper_.manageLabel($scope, $attributes, true);

      $scope.tabIndex = $attributes['tabIndex'] || 0;

      $scope.click = () => {
        if (!$scope.disable && !$scope.model.disabled) {
          $scope.model.bindable = $scope.value;
        }
      };

      radioGroupDatum.defaultScope.$watch('model', (value) => {
        $scope.model = value;
      });
      radioGroupDatum.defaultScope.$watch('disable', (value) => {
        $scope.disable = value;
      });
      radioGroupDatum.defaultScope.$watch('model.disabled', (value) => {
        if ($scope.model) {
          $scope.model.disabled = value;
        }
      });

      /**
       * Update this RadioField (UI) whenever the group's value changes.
       * This could be triggered by another RadioField in the group.
       */
      $scope.$watch('model.bindable', function(newValue:any) {
        $scope.checked =
          newValue !== undefined &&
          newValue !== null &&
          $scope.value !== undefined &&
          $scope.value !== null &&
          newValue.toString() === $scope.value.toString();
      });

      /**
       * Remove this RadioField from the group when it's removed from the DOM.
       */
      $scope.$on('$destroy', function() {
        radioGroupDatum.scopes.splice(
          radioGroupDatum.scopes.indexOf($scope), 1);

        if (radioGroupDatum.scopes.length === 0) {
          delete this.fieldNameToActiveRadioGroupDatumMap_[$scope.attribute];
        }
      });
    }
  }

  angular.module('formFor').directive('radioField',
    ($log, FormForConfiguration) => new RadioField($log, FormForConfiguration));
}