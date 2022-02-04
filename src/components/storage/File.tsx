import {StyledOcticon, Text} from '@primer/react';
import {FileIcon} from '@primer/octicons-react';
import React from 'react';
import {v4 as uuidv4} from 'uuid';

import {EditorFile} from '../../state';
import {StorageFile} from '../../storage';
import {useAppDispatch} from '../../store';
import {addFile} from '../../store/files';

export interface FileProps {
    file: StorageFile<unknown, unknown>;
}

export const File: React.FC<FileProps> = ({file}) => {
    const dispatch = useAppDispatch();

    const handleClick = async () => {
        const editorFile = new EditorFile(file);
        dispatch(addFile(editorFile));

        // TODO: open file in a panel with editorFile.getID()
    };

    return (
        <Text style={{cursor: 'pointer', userSelect: 'none'}} onClick={handleClick}>
            <StyledOcticon icon={FileIcon} sx={{mr: 1}} />
            {file.getName()}
        </Text>
    );
};
