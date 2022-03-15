import {ActionMenu, Box, StyledOcticon, Text} from '@primer/react';
import {ChevronDownIcon, ChevronRightIcon} from '@primer/octicons-react';
import React, {useMemo, useState} from 'react';

import {StorageDirectory, StorageEntry, StorageFile} from '../../storage';
import {RightClickAnchor} from '../anchor/RightClickAnchor';

import {Actions} from './Actions';
import {File} from './File';

export interface DirectoryProps {
    directory: StorageDirectory<unknown, unknown>;
}

export const Directory: React.FC<DirectoryProps> = ({directory}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isActionsOpen, setIsActionsOpen] = useState(false);
    const [entries, setEntries] = useState<StorageEntry<unknown, unknown>[] | undefined>(undefined);

    const sortedEntries = useMemo(() => {
        return entries?.sort((a, b) => {
            if (a.getType() !== b.getType()) {
                return a.getType() < b.getType() ? -1 : 1;
            }
            return a.getName() < b.getName() ? -1 : 1;
        });
    }, [entries]);

    const open = async () => {
        setEntries(await directory.getEntries(true));
        setIsOpen(true);
    };

    const close = () => {
        setIsOpen(false);
    };

    const handleClick: React.MouseEventHandler = () => {
        if (isActionsOpen) {
            setIsActionsOpen(false);
            return;
        }

        if (isOpen) {
            close();
        } else {
            open();
        }
    };

    const handleKeyDown: React.KeyboardEventHandler = (event) => {
        if (event.defaultPrevented || isActionsOpen) {
            return;
        }

        switch (event.key) {
            case 'ArrowLeft': {
                close();
                break;
            }
            case 'ArrowRight': {
                open();
                break;
            }
            case 'ArrowUp': {
                // TODO: select previous item in tree
                break;
            }
            case 'ArrowDown': {
                // TODO: select next item in tree
                break;
            }
            case 'Enter':
            case ' ': {
                if (isOpen) {
                    close();
                } else {
                    open();
                }
                break;
            }
            case 'ContextMenu': {
                setIsActionsOpen(!isActionsOpen);
                break;
            }
            default: {
                // Not a known key binding, so don't call prevent default
                return;
            }
        }

        event.preventDefault();
    };

    return (
        <>
            <ActionMenu open={isActionsOpen} onOpenChange={(open) => setIsActionsOpen(open)}>
                <ActionMenu.Anchor>
                    <RightClickAnchor childProps={{onKeyDown: handleKeyDown}}>
                        <Text onClick={handleClick} style={{cursor: 'pointer', userSelect: 'none'}}>
                            <StyledOcticon icon={isOpen ? ChevronDownIcon : ChevronRightIcon} sx={{mr: 1}} />
                            {directory.getName()}
                        </Text>
                    </RightClickAnchor>
                </ActionMenu.Anchor>

                <ActionMenu.Overlay>
                    <Actions entry={directory} />
                </ActionMenu.Overlay>
            </ActionMenu>

            {isOpen && sortedEntries && (
                <Box>
                    {sortedEntries.map((entry) => {
                        let component: JSX.Element;
                        if (entry instanceof StorageDirectory) {
                            component = <Directory directory={entry} />;
                        } else if (entry instanceof StorageFile) {
                            component = <File file={entry} />;
                        } else {
                            throw new Error(`Unknown storage entry type "${entry.getType()}".`);
                        }

                        return (
                            <Box key={entry.getName()} pl={3}>{component}</Box>
                        );
                    })}
                </Box>
            )}
        </>
    );
};
