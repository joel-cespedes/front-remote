export const MvThemeOverrides = {
  semantic: {
    primary: {
      50: '#e6f4fa',
      100: '#b3ddf0',
      200: '#80c6e6',
      300: '#4dafdc',
      400: '#2699d0',
      500: '#0088c6',
      600: '#007ab2',
      700: '#006a9b',
      800: '#005f8a',
      900: '#004d70',
      950: '#003a55'
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#eeeeee',
          300: '#e0e0e0',
          400: '#bdbdbd',
          500: '#9e9e9e',
          600: '#757575',
          700: '#666666',
          800: '#424242',
          900: '#333333',
          950: '#1a1a1a'
        },
        primary: {
          color: '#0088c6',
          contrastColor: '#ffffff',
          hoverColor: '#005f8a',
          activeColor: '#004d70'
        },
        formField: {
          background: '#ffffff',
          disabledBackground: '#f5f5f5',
          filledBackground: '#fafafa',
          borderColor: '#e0e0e0',
          hoverBorderColor: '#bdbdbd',
          focusBorderColor: '#0088c6',
          invalidBorderColor: '#d32f2f',
          color: '#333333',
          disabledColor: '#9e9e9e',
          placeholderColor: '#9e9e9e',
          floatLabelColor: '#666666',
          floatLabelFocusColor: '#0088c6',
          iconColor: '#666666'
        },
        text: {
          color: '#333333',
          hoverColor: '#1a1a1a',
          mutedColor: '#666666',
          hoverMutedColor: '#424242'
        },
        content: {
          background: '#ffffff',
          hoverBackground: '#f5f5f5',
          borderColor: '#e0e0e0',
          color: '#333333',
          hoverColor: '#1a1a1a'
        },
        highlight: {
          background: 'color-mix(in srgb, #0088c6 15%, transparent)',
          focusBackground: 'color-mix(in srgb, #0088c6 25%, transparent)',
          color: '#0088c6',
          focusColor: '#005f8a'
        },
        maskBackground: 'rgba(0, 0, 0, 0.5)',
        overlay: {
          select: {
            background: '#ffffff',
            borderColor: '#e0e0e0',
            color: '#333333'
          },
          popover: {
            background: '#ffffff',
            borderColor: '#e0e0e0',
            color: '#333333'
          },
          modal: {
            background: '#ffffff',
            borderColor: '#e0e0e0',
            color: '#333333'
          }
        },
        list: {
          option: {
            focusBackground: '#f5f5f5',
            selectedBackground: 'color-mix(in srgb, #0088c6 15%, transparent)',
            selectedFocusBackground: 'color-mix(in srgb, #0088c6 25%, transparent)',
            color: '#333333',
            focusColor: '#1a1a1a',
            selectedColor: '#0088c6',
            selectedFocusColor: '#005f8a',
            iconColor: '#666666',
            iconFocusColor: '#333333'
          },
          optionGroup: {
            background: 'transparent',
            color: '#666666'
          }
        },
        navigation: {
          item: {
            focusBackground: '#f5f5f5',
            activeBackground: 'color-mix(in srgb, #0088c6 15%, transparent)',
            color: '#333333',
            focusColor: '#1a1a1a',
            activeColor: '#0088c6',
            iconColor: '#666666',
            iconFocusColor: '#333333',
            iconActiveColor: '#0088c6'
          },
          submenuLabel: {
            background: 'transparent',
            color: '#666666'
          }
        }
      }
    }
  },
  components: {
    button: {
      colorScheme: {
        light: {
          root: {
            success: {
              background: '#4caf50',
              hoverBackground: '#43a047',
              activeBackground: '#388e3c',
              borderColor: '#4caf50',
              hoverBorderColor: '#43a047',
              activeBorderColor: '#388e3c',
              color: '#ffffff',
              hoverColor: '#ffffff',
              activeColor: '#ffffff'
            },
            warn: {
              background: '#f9a825',
              hoverBackground: '#f57f17',
              activeBackground: '#ef6c00',
              borderColor: '#f9a825',
              hoverBorderColor: '#f57f17',
              activeBorderColor: '#ef6c00',
              color: '#333333',
              hoverColor: '#333333',
              activeColor: '#ffffff'
            },
            danger: {
              background: '#d32f2f',
              hoverBackground: '#c62828',
              activeBackground: '#b71c1c',
              borderColor: '#d32f2f',
              hoverBorderColor: '#c62828',
              activeBorderColor: '#b71c1c',
              color: '#ffffff',
              hoverColor: '#ffffff',
              activeColor: '#ffffff'
            }
          }
        }
      }
    }
  }
};
