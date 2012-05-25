var lesstester = lesstester || {};

lesstester.Log = function (selector)
{
   var self, data;

   self = this;

   data = {
      container:$(selector),
      lines:""
   };

   self.config = function (obj)
   {
      $.each(obj, function (key, value)
      {
         data[ key ] = value;
      });
   };

   self.addMessage = function (msg)
   {
      var logElm = $("#result");
      logElm.html(msg);
   };

   self.addError = function (msg)
   {
      self.addMessage(
         '<strong class="label label-warning">ERROR</strong> {{msg}}'
            .replace("{{msg}}", msg)
      );
   };

   self.addCompiled = function (msg)
   {
      self.addMessage(
         '<strong class="label label-success">COMPILE</strong> {{msg}}'
            .replace("{{msg}}", msg)
      );
   };

   return self;

};
/**
 * Editor class
 * ( lesstester.editor )
 * @require jquery.js
 */

var lesstester = lesstester || {};

lesstester.Editor = function (selector)
{

   var self, $textarea, textarea, data, methods;

   self = this;
   self.appName = "Editor";
   self.selector = selector;

   $textarea = $(selector);
   textarea = $textarea.get(0);

   data = {
      msie:navigator.userAgent.match(/MSIE\s(.+?);/) !== null,
      LF:String.fromCharCode(10),
      CR:String.fromCharCode(13),
      TAB:String.fromCharCode(9),
      onShiftEnter:null
   };

   methods = {
      log:function (val)
      {
         console.log(val);
      },
      onKeyDown:function (e)
      {
         switch (e.keyCode)
         {
            case 9 : // tab
               methods.insertString(data.TAB);
               return false;
               break;
            case 13 : // return
               if (!$textarea.val().length)
               {
                  return;
               }
               var isShift = e.shiftKey;
               if (isShift && data.onShiftEnter !== null)
               {
                  data.onShiftEnter.apply(self);
                  return false;
               }
               else
               {
                  var match = methods.getBeforeLine().match(RegExp("^[" + data.TAB + "]+"));
                  if (match !== null)
                  {
                     methods.insertString(data.LF);
                     methods.insertString(
                        methods.getStringRepeat(data.TAB, ( match ) ? match[0].length : 0)
                     );
                     return false;
                  }
               }
               break;
            default :
               break;
         }
      },
      getCaretPosition:function ()
      {
         if (data.msie)
         {
            var range, src, pos, i;
            textarea.focus();

            // get position
            range = document.selection.createRange();
            range.moveStart("character", -textarea.value.length);
            src = range.text;
            pos = range.text.split("\r\n").join("\n").split("\n").join("/").length;

            // check if the beginning of a line or not
            i = pos;
            while (i--)
            {
               range.moveEnd("character", -1);
               if (( range.text.length - src.length ) == 0)
               {
                  pos += 1;
               }
               else
               {
                  break;
               }
            }

            return pos;
         }
         else
         {
            return textarea.selectionStart;
         }
      },
      setCaretPosition:function (pos)
      {
         if (data.msie)
         {
            var range;
            range = textarea.createTextRange();
            range.collapse();
            range.moveEnd("character", pos);
            range.moveStart("character", pos);
            range.select();
            return;
         }
         else
         {
            textarea.setSelectionRange(pos, pos);
            return;
         }
      },
      insertString:function (str)
      {
         var pos, val, leftStr, rightStr;
         pos = methods.getCaretPosition() || 0;
         val = $textarea.val();
         $textarea.val(val.substr(0, pos) + str + val.slice(pos));
         methods.setCaretPosition(pos + str.length);
         return;
      },
      getBeforeLine:function ()
      {
         var lines;
         lines = $textarea.val()
            .substr(0, methods.getCaretPosition() || 0)
            .split(data.LF);
         return lines[ lines.length - 1 ];
      },
      getStringRepeat:function (str, count)
      {
         var result = "";
         while (count--)
         {
            result += str;
         }
         return result;
      }
   };

   self.config = function (obj)
   {
      $.each(obj, function (key, value)
      {
         data[ key ] = value;
      });
   };

   self.val = function (value)
   {
      if (value)
      {
         $textarea.val(value);
      }
      return $textarea.val();
   };

   $textarea.bind("keydown", methods.onKeyDown);

   return self;
};
/**
 * Compiler class
 * ( lesstester.Compiler )
 * @require jquery.js, less.js
 */

var lesstester = lesstester || {};

lesstester.Compiler = function ()
{
   var self, data, events;

   self = this;

   data = {
      parser:new less.Parser(),
      compress:false,
      onComplete:function ()
      {
      },
      onError:function ()
      {
      }
   };

   self.config = function (obj)
   {
      $.each(obj, function (key, value)
      {
         data[ key ] = value;
      });
   };

   self.parse = function (less)
   {
      data.parser.parse(less, function (error, tree)
      {
         if (error)
         {
            data.onError(error);
            return;
         }
         var strResult;
         try
         {
            strResult = tree.toCSS({compress:data.compress});
            data.onComplete(strResult);
         }
         catch (e)
         {
            strResult = e.message;
            data.onError(e, "");
         }
      });
   };

   self.bind = function (name, handler)
   {
      $(self).bind(name, handler);
   };


   return self;

};

(function ($, undefined)
{
   var compiler, editor, log;
   log = new lesstester.Log("#result");
   compiler = new lesstester.Compiler();
   compiler.config({
      compress:false,
      onComplete:function (css)
      {
         $("#result").text(css);
         //log.addCompiled("Successfully compiled!");
      },
      onError:function (e, href)
      {
         var template = '<li><label>{line}</label><pre class="{class}">{content}</pre></li>';
         var error = [];
         var errorline = function (e, i, className)
         {
            if (e.extract[i])
            {
               error.push(template.replace(/\{line\}/, parseInt(e.line) + (i - 1))
                  .replace(/\{class\}/, className)
                  .replace(/\{content\}/, e.extract[i]));
            }
         };
         var content = "";
         var message = e.message;
         var resultElm = $("#result");
         content += '<strong class="label label-warning">ERROR</strong> ' + message;
         if (e.stack)
         {
            content += '<br />' + e.stack.split('\n').slice(1).join('<br />');
         }
         else if (e.extract)
         {
            errorline(e, 0, '')
            errorline(e, 1, 'line');
            errorline(e, 2, '');
            content += ' on line ' + e.line + ' column ' + e.column + '<br />';
            content += '<p class="error-message"><ul>' + error.join('') + '</ul></p>';
         }
         resultElm.html(content);
      }

   });

   // editor
   editor = new lesstester.Editor("#editor");
   editor.config({
      onShiftEnter:function ()
      {
         compiler.parse(this.val());
      }
   });

// Compile button
   $("#button-compile").click(function ()
   {
      compiler.parse(editor.val());
   });

   $("#editor").focus();


})(jQuery, undefined);