const functions = [
  {
    name: 'set_timecodes',
    description: 'Set the timecodes for the video with associated text',
    parameters: {
      type: 'object',
      properties: {
        timecodes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              time: {
                type: 'string',
              },
              text: {
                type: 'string',
              },
            },
            required: ['time', 'text'],
          },
        },
      },
      required: ['timecodes'],
    },
  },
  {
    name: 'set_timecodes_with_objects',
    description:
      'Set the timecodes for the video with associated text and object list',
    parameters: {
      type: 'object',
      properties: {
        timecodes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              time: {
                type: 'string',
              },
              text: {
                type: 'string',
              },
              objects: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            },
            required: ['time', 'text', 'objects'],
          },
        },
      },
      required: ['timecodes'],
    },
  },
  {
    name: 'set_timecodes_with_numeric_values',
    description:
      'Set the timecodes for the video with associated numeric values',
    parameters: {
      type: 'object',
      properties: {
        timecodes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              time: {
                type: 'string',
              },
              value: {
                type: 'number',
              },
            },
            required: ['time', 'value'],
          },
        },
      },
      required: ['timecodes'],
    },
  },
];

export default (fnMap) =>
  functions.map((fn) => ({
    ...fn,
    callback: fnMap[fn.name],
  }));
