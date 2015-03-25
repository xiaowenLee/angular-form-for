module formFor {

  /**
   *
   */
  export function FormForBuilderDirective($compile:ng.ICompileService, $parse:ng.IParseService):ng.IDirective {
    var nestedObjectHelper:NestedObjectHelper = new NestedObjectHelper($parse);

    return {
      require: 'formFor',
      restrict: 'A',

      link: function($scope:any,
                     $element:ng.IAugmentedJQuery,
                     $attributes:any,
                     formForController:FormForController):void {

        // View schema may be explicitly passed in as a separate model,
        // Or it may be combined with the validation rules used by formFor.
        var viewSchema:ViewSchema;

        if ($attributes.formForBuilder) {
          viewSchema = $scope.$eval($attributes.formForBuilder);
        } else if ($attributes.validationRules) {
          viewSchema = $scope.$eval($attributes.validationRules);
        } else if ($attributes.$service) {
          viewSchema = $scope.$eval($attributes.$service.validationRules);
        }

        // View schema may contain nested properties.
        // We will differentiate between form-fields and other properties using the 'inputType' field.
        var viewSchemaKeys:Array<string> = nestedObjectHelper.flattenObjectKeys(viewSchema);

        var htmlString = "";

        for (var i = 0, length = viewSchemaKeys.length; i < length; i++) {
          var fieldName:string = viewSchemaKeys[i];
          var viewField:ViewField = nestedObjectHelper.readAttribute(viewSchema, fieldName);
          var html:string;

          if (viewField && viewField.hasOwnProperty('inputType')) {
            var help:string = viewField.help || '';
            var label:string = viewField.label || '';
            var uid:string = viewField.uid || '';

            switch (viewField.inputType) {
              case BuilderFieldType.CHECKBOX:
                htmlString += `<checkbox-field attribute="${fieldName}"
                                               help="${help}"
                                               label="${label}"
                                               uid="${uid}">
                               </checkbox-field>`;
                break;
              case BuilderFieldType.RADIO:
                htmlString += `<field-label help="${help}"
                                              label="${label}">
                                 </field-label>`;

                viewField.values.forEach((value:any) => {
                  var label:string = StringUtil.humanize(value);

                  htmlString += `<radio-field attribute="${fieldName}"
                                              label="${label}"
                                              uid="${uid}"
                                              value="${value}">
                                 </radio-field>`;
                });
                break;
              case BuilderFieldType.SELECT:
                // TODO Binding doesn't work for options="${viewField.values}"
                htmlString += `<select-field attribute="${fieldName}"
                                             help="${help}"
                                             label="${label}"
                                             label-attribute="${viewField.labelAttribute || ''}"
                                             multiple="${!!viewField.multipleSelection}"
                                             ng-attr-allow-blank="${!!viewField.allowBlank}"
                                             ng-attr-enable-filtering="${!!viewField.enableFiltering}"
                                             options="${viewField.values}"
                                             uid="${uid}"
                                             value-attribute="${viewField.valueAttribute || ''}">
                               </select-field>`;
                break;
              case BuilderFieldType.NUMBER:
              case BuilderFieldType.PASSWORD:
              case BuilderFieldType.TEXT:
                htmlString += `<text-field attribute="${fieldName}"
                                           label="${label}"
                                           help="${help}"
                                           ng-attr-multiline="${!!viewField.multiline}"
                                           rows="${viewField.rows || ''}"
                                           type="${viewField.inputType}"
                                           uid="${uid}">
                               </text-field>`;
                break;
            }
          }
        }

        // Append a submit button if one isn't already present inside of $element.
        if ($element.find('input[type=button], button').length === 0) {
          htmlString += `<submit-button label="Submit"></submit-button>`;
        }

        var linkingFunction:any = $compile(htmlString);
        var compiled = linkingFunction($scope, undefined, {transcludeControllers: formForController});

        // Prepend in case the user has specified their own custom submit button(s).
        $element.prepend(compiled);
      }
    };
  };

  angular.module('formFor').directive('formForBuilder',
    ($compile, $parse) => FormForBuilderDirective($compile, $parse));
}